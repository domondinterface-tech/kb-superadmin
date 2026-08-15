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
        description={`${tenants.length} enstans KB Books apa pou biznis ekstèn.`}
        action={
          <Link
            href="/tenants/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-600/20 transition-colors hover:bg-indigo-500"
          >
            <span className="text-base leading-none">+</span> Nouvo Tenant
          </Link>
        }
      />

      <Card>
        {tenants.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
            </div>
            <p className="text-sm text-slate-500">Pa gen tenant ankò. Klike &quot;+ Nouvo Tenant&quot; pou kreye premye a.</p>
          </div>
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
                    <tr key={t.id} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50">
                      <td className="py-3 pr-4">
                        <Link href={`/tenants/${t.id}`} className="font-medium text-indigo-600 hover:underline">
                          {t.name}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{t.brandName}</td>
                      <td className="py-3 pr-4 text-slate-600">{t.adminEmail}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <form action={toggle}>
                          <button type="submit" className="cursor-pointer">
                            <Badge tone={t.active ? "positive" : "default"}>{t.active ? "Aktif" : "Dezaktive"}</Badge>
                          </button>
                        </form>
                      </td>
                      <td className="py-3 text-slate-500">{t.createdAt.toLocaleDateString("fr-HT")}</td>
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
