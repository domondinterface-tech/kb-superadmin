"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { provisionTenant, finishDeploy } from "@/lib/railway";

export type CreateTenantState = { error: string | null };

export async function createTenant(_prevState: CreateTenantState, formData: FormData): Promise<CreateTenantState> {
  await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const brandName = String(formData.get("brandName") ?? "").trim();
  const adminEmail = String(formData.get("adminEmail") ?? "")
    .trim()
    .toLowerCase();

  if (!name || !brandName || !adminEmail) {
    return { error: "Ranpli tout chan yo: non tenant la, non mak la, ak imèl admin la." };
  }
  if (!adminEmail.includes("@")) {
    return { error: "Antre yon imèl valid pou admin la." };
  }

  const tenant = await prisma.tenant.create({
    data: { name, brandName, adminEmail, status: "PENDING" },
  });

  revalidatePath("/");
  redirect(`/tenants/${tenant.id}`);
}

/** Runs (or re-runs) Railway provisioning for a tenant and persists the outcome. */
export async function runProvisioning(tenantId: string): Promise<void> {
  await requireUser();

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return;
  // Guards against a double-fired click (or any other concurrent duplicate
  // call) launching two provisionTenant() runs at once — each one calls
  // Railway's API ~10 times, and a second overlapping run is what was
  // tripping Railway's per-workspace project-creation rate limit even on
  // otherwise-idle retries.
  if (tenant.status === "PROVISIONING") return;

  await prisma.tenant.update({ where: { id: tenantId }, data: { status: "PROVISIONING", errorMessage: null } });

  const result = await provisionTenant({
    tenantId: tenant.id,
    name: tenant.name,
    brandName: tenant.brandName,
    adminEmail: tenant.adminEmail,
  });

  if (result.ok) {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: "NEEDS_GITHUB_CONNECT",
        railwayProjectId: result.projectId,
        railwayServiceId: result.serviceId,
        railwayEnvironmentId: result.environmentId,
        appUrl: result.appUrl,
        adminTempPassword: result.adminTempPassword,
        errorMessage: null,
      },
    });
  } else {
    const blocked = result.error.includes("RAILWAY_API_TOKEN pa konfigire");
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { status: blocked ? "BLOCKED_NO_TOKEN" : "FAILED", errorMessage: result.error },
    });
  }

  revalidatePath(`/tenants/${tenantId}`);
  revalidatePath("/");
}

/**
 * Second half of provisioning: call once the SuperAdmin has connected the
 * GitHub repo by hand in the Railway dashboard for this tenant's service.
 */
export async function runFinishDeploy(tenantId: string): Promise<void> {
  await requireUser();

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant || tenant.status !== "NEEDS_GITHUB_CONNECT") return;
  if (!tenant.railwayServiceId || !tenant.railwayEnvironmentId) return;

  const result = await finishDeploy(tenant.railwayEnvironmentId, tenant.railwayServiceId);

  if (result.ok) {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { status: "ACTIVE", errorMessage: null },
    });
  } else {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { errorMessage: result.error },
    });
  }

  revalidatePath(`/tenants/${tenantId}`);
  revalidatePath("/");
}
