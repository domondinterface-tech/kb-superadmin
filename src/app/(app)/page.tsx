import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, Badge } from "@/components/ui";
import { toggleTenantActive } from "@/lib/actions/tenants";
import type { TenantStatus } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<TenantStatus, "default" | "positive" | "negative" | "warning"> = {
  PENDING: "default",
  PROVISIONING: "warning",
  NEEDS_GITHUB_CONNECT: "warning",
  ACTIVE: "positive",
  FAILED: "negative",
  BLOCKED_NO_TOKEN: "negative",
};

const STATUS_LABEL: Record<TenantStatus, string> = {
  PENDING: "An atant",
  PROVISIONING: "Ap kreye...",
  NEEDS_GITHUB_CONNECT: "Mande konekte GitHub",
  ACTIVE: "Aktif",
  FAILED: "Echwe",
  BLOCKED_NO_TOKEN: "Bloke — pa gen token",
};

export default async function DashboardPage() {
  const tenants = await prisma.tenant.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenant yo"
        description="Chak tenant se yon enstans KB Books apa pou yon biznis ekstèn."
        action={
          <Link href="/tenants/new" className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
            + Nouvo Tenant
          </Link>
        }
      />

      <Card>
        {tenants.length === 0 ? (
          <p className="text-sm text-slate-500">Pa gen tenant ankò. Klike &quot;+ Nouvo Tenant&quot; pou kreye premye a.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-4">Non</th>
                  <th className="pb-2 pr-4">Mak</th>
                  <th className="pb-2 pr-4">Imèl Admin</th>
                  <th className="pb-2 pr-4">Estati</th>
                  <th className="pb-2 pr-4">Aktif</th>
                  <th className="pb-2">Kreye</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => {
                  const toggle = toggleTenantActive.bind(null, t.id);
                  return (
                    <tr key={t.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-4">
                        <Link href={`/tenants/${t.id}`} className="font-medium text-indigo-600 hover:underline">
                          {t.name}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 text-slate-600">{t.brandName}</td>
                      <td className="py-2 pr-4 text-slate-600">{t.adminEmail}</td>
                      <td className="py-2 pr-4">
                        <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                      </td>
                      <td className="py-2 pr-4">
                        <form action={toggle}>
                          <button type="submit" className="cursor-pointer">
                            <Badge tone={t.active ? "positive" : "default"}>{t.active ? "Aktif" : "Dezaktive"}</Badge>
                          </button>
                        </form>
                      </td>
                      <td className="py-2 text-slate-500">{t.createdAt.toLocaleDateString("fr-HT")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
