import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, Badge, SubmitButton, CopyButton } from "@/components/ui";
import { runProvisioning, runFinishDeploy, toggleTenantActive } from "@/lib/actions/tenants";
import { fetchTenantSummary } from "@/lib/tenantSummary";

export const dynamic = "force-dynamic";

function money(n: number, currency: "HTG" | "USD"): string {
  return `${n.toLocaleString("fr-HT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) notFound();

  const provision = runProvisioning.bind(null, tenant.id);
  const finishDeploy = runFinishDeploy.bind(null, tenant.id);
  const toggleActive = toggleTenantActive.bind(null, tenant.id);
  const railwayProjectUrl = tenant.railwayProjectId ? `https://railway.com/project/${tenant.railwayProjectId}` : null;

  const summary = tenant.status === "ACTIVE" && tenant.appUrl ? await fetchTenantSummary(tenant.appUrl) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={tenant.name}
        description={tenant.brandName}
        action={
          <form action={toggleActive}>
            <SubmitButton variant="secondary">{tenant.active ? "Dezaktive" : "Reaktive"}</SubmitButton>
          </form>
        }
      />

      {!tenant.active && (
        <div className="rounded-md border border-slate-300 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
          Tenant sa a make <strong>dezaktive</strong> — se yon drapo swivi sèlman, li pa bloke aksè tenant la nan pwòp enstans KB Books li.
        </div>
      )}

      <Card title="Estati">
        <div className="flex items-center gap-3">
          <Badge
            tone={
              tenant.status === "ACTIVE"
                ? "positive"
                : tenant.status === "PROVISIONING" || tenant.status === "NEEDS_GITHUB_CONNECT"
                  ? "warning"
                  : tenant.status === "PENDING"
                    ? "default"
                    : "negative"
            }
          >
            {tenant.status}
          </Badge>
          {tenant.status !== "PROVISIONING" && tenant.status !== "NEEDS_GITHUB_CONNECT" && (
            <form action={provision}>
              <SubmitButton>{tenant.status === "ACTIVE" ? "Re-provizyone" : "Provizyone Kounye A"}</SubmitButton>
            </form>
          )}
        </div>

        {tenant.errorMessage && (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3">
            <p className="text-sm font-medium text-rose-800">Erè</p>
            <p className="mt-1 text-sm text-rose-700">{tenant.errorMessage}</p>
            {tenant.status === "BLOCKED_NO_TOKEN" && (
              <p className="mt-2 text-xs text-rose-600">
                Mete varyab anviwònman <code>RAILWAY_API_TOKEN</code> sou sèvè SuperAdmin la, epi klike &quot;Provizyone Kounye A&quot; ankò.
              </p>
            )}
          </div>
        )}

        {tenant.status === "NEEDS_GITHUB_CONNECT" && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-800">Rete yon dènye etap manyèl</p>
            <p className="mt-1 text-sm text-amber-700">
              Pwojè Railway a, sèvis la, Volume la, domèn lan, ak tout varyab yo deja kreye. Sèl bagay ki rete: konekte repo GitHub la nan
              dashboard Railway a (token API la pa gen otorizasyon GitHub pou fè sa otomatikman).
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-amber-700">
              <li>
                Ale sou{" "}
                {railwayProjectUrl ? (
                  <a href={railwayProjectUrl} target="_blank" rel="noreferrer" className="underline">
                    pwojè Railway a
                  </a>
                ) : (
                  "pwojè Railway a"
                )}
                .
              </li>
              <li>
                Klike sou sèvis la (non li: <code>kb-books</code>) → <strong>Settings → Source</strong> → konekte repo{" "}
                <code>domondinterface-tech/myaccountingapp</code> (branch <code>main</code>).
              </li>
              <li>Retounen isit la epi klike bouton anba a pou deklanche premye deplwaman an.</li>
            </ol>
            <form action={finishDeploy} className="mt-3">
              <SubmitButton>Fini Deplwaman an</SubmitButton>
            </form>
          </div>
        )}

        {tenant.status === "ACTIVE" && (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-sm font-medium text-emerald-800">Enstans KB Books la aktif</p>
            <dl className="mt-2 space-y-1 text-sm text-emerald-700">
              {tenant.appUrl && (
                <div>
                  <dt className="inline font-medium">URL: </dt>
                  <dd className="inline">
                    <a href={tenant.appUrl} target="_blank" rel="noreferrer" className="underline">
                      {tenant.appUrl}
                    </a>
                  </dd>
                </div>
              )}
              <div>
                <dt className="inline font-medium">Imèl Admin: </dt>
                <dd className="inline">{tenant.adminEmail}</dd>
              </div>
              {tenant.adminTempPassword && (
                <div className="flex items-center gap-2">
                  <dt className="font-medium">Modpas Tanporè: </dt>
                  <dd className="font-mono">{tenant.adminTempPassword}</dd>
                  <CopyButton value={tenant.adminTempPassword} />
                </div>
              )}
            </dl>
            {tenant.appUrl && (
              <a
                href={`${tenant.appUrl}/login`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
              >
                Ale nan Paj Login Tenant la →
              </a>
            )}
            <p className="mt-2 text-xs text-emerald-600">Bay admin tenant la enfòmasyon sa yo yon sèl fwa — mande yo chanje modpas la apre premye koneksyon.</p>
          </div>
        )}
      </Card>

      {tenant.status === "ACTIVE" && (
        <Card title="Rezime Finansye">
          {summary?.ok ? (
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Kach Kòf (HTG)</dt>
                <dd className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{money(summary.data.cashHTG, "HTG")}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Kach Kòf (USD)</dt>
                <dd className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{money(summary.data.cashUSD, "USD")}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Total Aktif</dt>
                <dd className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{money(summary.data.totalAsset, "HTG")}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Pwofi Net</dt>
                <dd className={`mt-1 text-lg font-semibold ${summary.data.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {money(summary.data.netProfit, "HTG")}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Bilan</dt>
                <dd className="mt-1">
                  <Badge tone={summary.data.isBalanced ? "positive" : "negative"}>{summary.data.isBalanced ? "Balanse" : "Pa Balanse"}</Badge>
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-slate-500">
              {summary ? `Pa t ka chaje rezime finansye a: ${summary.error}` : "Pa gen rezime finansye disponib pou tenant sa a."}
            </p>
          )}
          {summary && !summary.ok && (
            <p className="mt-2 text-xs text-slate-400">
              Si sa se yon tenant ki te kreye anvan <code>SUPERADMIN_API_KEY</code> te konfigire, mete menm valè varyab sa a nan Railway pou
              tenant sa a tou (Variables), epi redeplwaye.
            </p>
          )}
        </Card>
      )}

      <Card title="Detay Teknik">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <dt className="text-slate-500">Railway Project ID</dt>
            <dd className="font-mono text-slate-700">{tenant.railwayProjectId ?? "—"}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <dt className="text-slate-500">Railway Service ID</dt>
            <dd className="font-mono text-slate-700">{tenant.railwayServiceId ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Kreye</dt>
            <dd className="text-slate-700">{tenant.createdAt.toLocaleString("fr-HT")}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
