// Railway API client — creates one Railway project/service per tenant, running
// the same KB Books code (domondinterface-tech/myaccountingapp), each with its
// own persistent Volume (SQLite lives on disk — see that repo's README) and its
// own BRAND_NAME/ADMIN_* environment variables.
//
// STATUS: written against Railway's public GraphQL API from general knowledge of
// its shape (endpoint, auth header, typical mutation names). This sandbox has no
// network access to Railway to run a live schema introspection or a real test
// call, and no RAILWAY_API_TOKEN has been provided yet (see ROADMAP.md in the
// myaccountingapp repo). Before relying on this in production:
//   1. Run an introspection query against RAILWAY_API_URL with a real token.
//   2. Confirm each mutation name/argument shape below still matches — Railway's
//      API is not guaranteed stable across versions.
//   3. Do a real end-to-end provisionTenant() call against a throwaway tenant.

import crypto from "crypto";

const RAILWAY_API_URL = "https://backboard.railway.app/graphql/v2";

// The KB Books codebase every tenant gets their own deployed copy of.
const KB_BOOKS_REPO = "domondinterface-tech/myaccountingapp";
const KB_BOOKS_BRANCH = "main";

export type ProvisionInput = {
  tenantId: string;
  name: string;
  brandName: string;
  adminEmail: string;
};

export type ProvisionResult =
  | { ok: true; projectId: string; serviceId: string; appUrl: string; adminTempPassword: string }
  | { ok: false; error: string };

class RailwayApiError extends Error {}

async function railwayGraphQL<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const token = process.env.RAILWAY_API_TOKEN;
  if (!token) {
    throw new RailwayApiError("RAILWAY_API_TOKEN pa konfigire.");
  }

  const res = await fetch(RAILWAY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = (await res.json()) as {
    data?: T;
    errors?: { message: string; extensions?: Record<string, unknown>; path?: (string | number)[] }[];
  };

  if (json.errors?.length) {
    // Railway's top-level error messages are often generic ("Problem processing
    // request") — the useful detail lives in each error's `extensions`/`path`.
    // Log the raw payload server-side (visible in Railway's own Deploy Logs for
    // this service) and surface it in the thrown message too, since that's what
    // ends up on the Tenant row for the SuperAdmin to read.
    console.error("Railway GraphQL error", JSON.stringify(json.errors, null, 2));
    const detail = json.errors
      .map((e) => {
        const extra = e.extensions ? ` ${JSON.stringify(e.extensions)}` : "";
        const path = e.path ? ` [${e.path.join(".")}]` : "";
        return `${e.message}${path}${extra}`;
      })
      .join("; ");
    throw new RailwayApiError(detail);
  }
  if (!json.data) {
    throw new RailwayApiError(`Railway API pa retounen okenn done (HTTP ${res.status}).`);
  }
  return json.data;
}

function randomPassword(): string {
  return crypto.randomBytes(12).toString("base64url");
}

function randomPin(): string {
  return String(crypto.randomInt(1000, 10000));
}

async function createProject(name: string): Promise<string> {
  const data = await railwayGraphQL<{ projectCreate: { id: string } }>(
    `mutation ProjectCreate($input: ProjectCreateInput!) {
      projectCreate(input: $input) { id }
    }`,
    { input: { name } },
  );
  return data.projectCreate.id;
}

async function createServiceFromRepo(projectId: string, name: string): Promise<string> {
  const data = await railwayGraphQL<{ serviceCreate: { id: string } }>(
    `mutation ServiceCreate($input: ServiceCreateInput!) {
      serviceCreate(input: $input) { id }
    }`,
    {
      input: {
        projectId,
        name,
        source: { repo: KB_BOOKS_REPO, branch: KB_BOOKS_BRANCH },
      },
    },
  );
  return data.serviceCreate.id;
}

async function createVolume(projectId: string, serviceId: string, mountPath: string): Promise<void> {
  await railwayGraphQL(
    `mutation VolumeCreate($input: VolumeCreateInput!) {
      volumeCreate(input: $input) { id }
    }`,
    { input: { projectId, serviceId, mountPath } },
  );
}

async function setVariables(projectId: string, serviceId: string, variables: Record<string, string>): Promise<void> {
  for (const [name, value] of Object.entries(variables)) {
    await railwayGraphQL(
      `mutation VariableUpsert($input: VariableUpsertInput!) {
        variableUpsert(input: $input)
      }`,
      { input: { projectId, serviceId, name, value } },
    );
  }
}

async function createDomain(serviceId: string): Promise<string> {
  const data = await railwayGraphQL<{ serviceDomainCreate: { domain: string } }>(
    `mutation ServiceDomainCreate($input: ServiceDomainCreateInput!) {
      serviceDomainCreate(input: $input) { domain }
    }`,
    { input: { serviceId } },
  );
  return data.serviceDomainCreate.domain;
}

async function triggerDeploy(serviceId: string): Promise<void> {
  await railwayGraphQL(
    `mutation ServiceInstanceDeploy($serviceId: String!) {
      serviceInstanceDeploy(serviceId: $serviceId)
    }`,
    { serviceId },
  );
}

async function deleteProject(projectId: string): Promise<void> {
  await railwayGraphQL(
    `mutation ProjectDelete($id: String!) {
      projectDelete(id: $id)
    }`,
    { id: projectId },
  );
}

/**
 * Full tenant provisioning flow: new Railway project → service deployed from
 * the KB Books repo → persistent Volume for the SQLite file → tenant-specific
 * env vars → public domain → deploy trigger.
 *
 * Returns `{ ok: false }` (never throws) so the caller can persist the error
 * onto the Tenant row instead of losing it to an unhandled rejection.
 */
export async function provisionTenant(input: ProvisionInput): Promise<ProvisionResult> {
  if (!process.env.RAILWAY_API_TOKEN) {
    return { ok: false, error: "RAILWAY_API_TOKEN pa konfigire sou sèvè a. Mande yon devlopè mete varyab sa a anvan ou eseye provizyone yon tenant." };
  }

  const adminTempPassword = randomPassword();
  const dangerZonePin = randomPin();

  // Tracked outside the try block so the catch handler can roll back a
  // project that got created before a later step failed — otherwise every
  // failed attempt past this point leaves an empty orphan project behind.
  let createdProjectId: string | undefined;

  try {
    const projectId = await createProject(`kb-books-${input.name}`);
    createdProjectId = projectId;
    const serviceId = await createServiceFromRepo(projectId, "kb-books");

    // SQLite lives on disk (see myaccountingapp/README.md) — without a mounted
    // Volume the database is lost on every redeploy, so this is not optional.
    //
    // Mount path must NOT be /app/prisma (or any path already inside the
    // deployed image): Railway Volumes are mounted over whatever's already at
    // that path, so schema.prisma and the migrations/ directory baked into
    // the image would become invisible to Prisma at runtime ("file or
    // directory not found"). /data is empty in the image, so nothing gets
    // shadowed — only the mutable dev.db file needs to persist here.
    await createVolume(projectId, serviceId, "/data");

    await setVariables(projectId, serviceId, {
      DATABASE_URL: "file:/data/dev.db",
      ADMIN_EMAIL: input.adminEmail,
      ADMIN_PASSWORD: adminTempPassword,
      ADMIN_NAME: "Admin",
      BRAND_NAME: input.brandName,
      DANGER_ZONE_PIN: dangerZonePin,
      NODE_ENV: "production",
    });

    const domain = await createDomain(serviceId);
    await triggerDeploy(serviceId);

    return { ok: true, projectId, serviceId, appUrl: `https://${domain}`, adminTempPassword };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (createdProjectId) {
      try {
        await deleteProject(createdProjectId);
      } catch (cleanupErr) {
        // Don't let a failed rollback hide the original error — just log it
        // so an orphan project doesn't go unnoticed.
        console.error(`Failed to roll back orphan project ${createdProjectId}`, cleanupErr);
      }
    }

    return { ok: false, error: message };
  }
}
