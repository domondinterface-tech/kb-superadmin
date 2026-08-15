// Railway API client — creates one Railway project/service per tenant, running
// the same KB Books code (domondinterface-tech/myaccountingapp), each with its
// own persistent Volume (SQLite lives on disk — see that repo's README) and its
// own BRAND_NAME/ADMIN_* environment variables.
//
// Mutation shapes below were confirmed against a live introspection query run
// from outside this sandbox (which has no direct network path to Railway) —
// see ServiceCreateInput, ProjectCreateInput, ServiceSourceInput,
// VolumeCreateInput, VariableUpsertInput, ServiceDomainCreateInput,
// ServiceInstanceDeploy, and Project.baseEnvironmentId/primaryEnvironmentId.
// Confirmed live, in order of discovery:
//   - `branch` is a top-level field on ServiceCreateInput, NOT nested inside
//     `source` (ServiceSourceInput only accepts `repo`/`image`).
//   - VariableUpsertInput and ServiceDomainCreateInput both require a real
//     `environmentId` (Railway scopes services to an Environment within a
//     Project, e.g. "production").
//   - Project.baseEnvironmentId is for PR-environment base-branch tracking
//     and is null on a normal project — the real default environment id is
//     Project.primaryEnvironmentId.
//   - serviceInstanceDeploy takes serviceId AND environmentId as direct
//     arguments, not wrapped in an input object.
//   - projectCreate with no workspaceId lands the project in the caller's
//     default workspace, which is NOT necessarily the workspace holding the
//     Railway↔GitHub App installation — a project created that way got
//     "Repository ... not found or is not accessible" when deploying, even
//     though the exact same repo already deploys fine elsewhere on the
//     account. RAILWAY_WORKSPACE_ID pins every tenant project to the
//     workspace where domondinterface-tech/myaccountingapp is actually
//     accessible. Pinning the workspace alone did NOT fix the "not
//     accessible" error, though — confirmed by a further live check that
//     `me` and `githubRepos` both come back "Not Authorized" for this
//     token. This API token (created from Railway's Tokens page, scoped to
//     a workspace) simply doesn't carry GitHub App authorization — that's
//     tied to a logged-in user's own OAuth session, which no API token
//     exposes. There is no mutation-shape fix for this.
//
// Because of that, provisioning stops short of connecting the GitHub source:
// it creates the project/service/volume/variables/domain, then returns
// needsManualConnect so the SuperAdmin can connect the repo once by hand in
// the Railway dashboard (the one flow that does carry real GitHub auth), and
// call finishDeploy() afterwards to trigger the first deploy via API.

import crypto from "crypto";

const RAILWAY_API_URL = "https://backboard.railway.app/graphql/v2";

// The KB Books codebase every tenant gets their own deployed copy of.
const KB_BOOKS_REPO = "domondinterface-tech/MyAccountingApp";
const KB_BOOKS_BRANCH = "main";

// The Railway workspace ("domondinterface-tech's Projects") that has the
// GitHub App installation with access to KB_BOOKS_REPO. Confirmed live via
// `project(id: <a known project's id>) { workspaceId }`.
const RAILWAY_WORKSPACE_ID = "1996eb18-dc72-400d-a2b1-fe58c0b5664e";

export type ProvisionInput = {
  tenantId: string;
  name: string;
  brandName: string;
  adminEmail: string;
};

export type ProvisionResult =
  | {
      ok: true;
      needsManualConnect: true;
      projectId: string;
      serviceId: string;
      environmentId: string;
      appUrl: string;
      adminTempPassword: string;
    }
  | { ok: false; error: string };

export type DeployResult = { ok: true } | { ok: false; error: string };

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

async function createProject(name: string): Promise<{ projectId: string; environmentId: string }> {
  const data = await railwayGraphQL<{
    projectCreate: {
      id: string;
      baseEnvironmentId: string | null;
      primaryEnvironmentId: string | null;
      environments: { edges: { node: { id: string } }[] };
    };
  }>(
    `mutation ProjectCreate($input: ProjectCreateInput!) {
      projectCreate(input: $input) {
        id
        baseEnvironmentId
        primaryEnvironmentId
        environments { edges { node { id } } }
      }
    }`,
    { input: { name, workspaceId: RAILWAY_WORKSPACE_ID } },
  );
  const { id: projectId, primaryEnvironmentId, baseEnvironmentId, environments } = data.projectCreate;
  // baseEnvironmentId is null on a normal project (it's for PR-environment
  // base-branch tracking) — primaryEnvironmentId is the real default
  // environment, with the environments connection as a last-resort fallback.
  const environmentId = primaryEnvironmentId ?? baseEnvironmentId ?? environments.edges[0]?.node.id;
  if (!environmentId) {
    throw new RailwayApiError(`Pwojè ${projectId} kreye men li pa gen okenn environment ki disponib — pa ka kontinye san sa.`);
  }
  return { projectId, environmentId };
}

async function createServiceFromRepo(projectId: string, environmentId: string, name: string): Promise<string> {
  const data = await railwayGraphQL<{ serviceCreate: { id: string } }>(
    `mutation ServiceCreate($input: ServiceCreateInput!) {
      serviceCreate(input: $input) { id }
    }`,
    {
      input: {
        projectId,
        environmentId,
        name,
        branch: KB_BOOKS_BRANCH,
        source: { repo: KB_BOOKS_REPO },
      },
    },
  );
  return data.serviceCreate.id;
}

async function createVolume(projectId: string, environmentId: string, serviceId: string, mountPath: string): Promise<void> {
  await railwayGraphQL(
    `mutation VolumeCreate($input: VolumeCreateInput!) {
      volumeCreate(input: $input) { id }
    }`,
    { input: { projectId, environmentId, serviceId, mountPath } },
  );
}

async function setVariables(
  projectId: string,
  environmentId: string,
  serviceId: string,
  variables: Record<string, string>,
): Promise<void> {
  for (const [name, value] of Object.entries(variables)) {
    await railwayGraphQL(
      `mutation VariableUpsert($input: VariableUpsertInput!) {
        variableUpsert(input: $input)
      }`,
      { input: { projectId, environmentId, serviceId, name, value } },
    );
  }
}

async function createDomain(environmentId: string, serviceId: string): Promise<string> {
  const data = await railwayGraphQL<{ serviceDomainCreate: { domain: string } }>(
    `mutation ServiceDomainCreate($input: ServiceDomainCreateInput!) {
      serviceDomainCreate(input: $input) { domain }
    }`,
    { input: { environmentId, serviceId } },
  );
  return data.serviceDomainCreate.domain;
}

async function triggerDeploy(environmentId: string, serviceId: string): Promise<void> {
  await railwayGraphQL(
    `mutation ServiceInstanceDeploy($serviceId: String!, $environmentId: String!) {
      serviceInstanceDeploy(serviceId: $serviceId, environmentId: $environmentId)
    }`,
    { serviceId, environmentId },
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
 * Tenant provisioning flow: new Railway project → service pointed at the KB
 * Books repo → persistent Volume for the SQLite file → tenant-specific env
 * vars → public domain. Stops there — see the file header for why the actual
 * deploy trigger is a separate manual-then-API step (finishDeploy below).
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
    const { projectId, environmentId } = await createProject(`kb-books-${input.name}`);
    createdProjectId = projectId;
    const serviceId = await createServiceFromRepo(projectId, environmentId, "kb-books");

    // SQLite lives on disk (see myaccountingapp/README.md) — without a mounted
    // Volume the database is lost on every redeploy, so this is not optional.
    //
    // Mount path must NOT be /app/prisma (or any path already inside the
    // deployed image): Railway Volumes are mounted over whatever's already at
    // that path, so schema.prisma and the migrations/ directory baked into
    // the image would become invisible to Prisma at runtime ("file or
    // directory not found"). /data is empty in the image, so nothing gets
    // shadowed — only the mutable dev.db file needs to persist here.
    await createVolume(projectId, environmentId, serviceId, "/data");

    await setVariables(projectId, environmentId, serviceId, {
      DATABASE_URL: "file:/data/dev.db",
      ADMIN_EMAIL: input.adminEmail,
      ADMIN_PASSWORD: adminTempPassword,
      ADMIN_NAME: "Admin",
      BRAND_NAME: input.brandName,
      DANGER_ZONE_PIN: dangerZonePin,
      NODE_ENV: "production",
      // Lets this SuperAdmin fetch a financial summary from the tenant's own
      // /api/superadmin/summary route (header-auth, no cookie session) —
      // only set if configured here too, so provisioning still works before
      // that's set up.
      ...(process.env.SUPERADMIN_API_KEY ? { SUPERADMIN_API_KEY: process.env.SUPERADMIN_API_KEY } : {}),
    });

    const domain = await createDomain(environmentId, serviceId);

    return {
      ok: true,
      needsManualConnect: true,
      projectId,
      serviceId,
      environmentId,
      appUrl: `https://${domain}`,
      adminTempPassword,
    };
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

/**
 * True if `appUrl` responds at all (any non-5xx status, redirects included —
 * a redirect to /login is the expected response on "/"). Used as a fallback
 * signal when the Railway deploy-trigger mutation errors out even though a
 * real deploy already succeeded (see finishDeploy below).
 */
async function isAppReachable(appUrl: string): Promise<boolean> {
  try {
    const res = await fetch(appUrl, { signal: AbortSignal.timeout(8000), redirect: "manual" });
    return res.status < 500;
  } catch {
    return false;
  }
}

/**
 * Second half of provisioning: call once the SuperAdmin has connected the
 * GitHub repo by hand in the Railway dashboard for this service (the one
 * flow that carries real GitHub authorization — see the file header). Just
 * triggers the first deploy; everything else was already set up by
 * provisionTenant().
 *
 * serviceInstanceDeploy has been observed to fail with "Repository not
 * found or is not accessible" even right after a successful manual
 * reconnect in the Railway dashboard — confirmed live to be a stale cached
 * source reference on Railway's side, since a real push-triggered webhook
 * deploy for the same service succeeds immediately after. So on failure we
 * fall back to checking whether the app is actually live before giving up.
 */
export async function finishDeploy(environmentId: string, serviceId: string, appUrl?: string): Promise<DeployResult> {
  if (!process.env.RAILWAY_API_TOKEN) {
    return { ok: false, error: "RAILWAY_API_TOKEN pa konfigire sou sèvè a." };
  }
  try {
    await triggerDeploy(environmentId, serviceId);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (appUrl && (await isAppReachable(appUrl))) {
      return { ok: true };
    }
    return { ok: false, error: message };
  }
}
