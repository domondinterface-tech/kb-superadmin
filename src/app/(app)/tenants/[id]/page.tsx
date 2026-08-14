import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, Badge, SubmitButton } from "@/components/ui";
import { runProvisioning, runFinishDeploy } from "@/lib/actions/tenants";

export const dynamic = "force-dynamic";

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) notFound();

  const provision = runProvisioning.bind(null, tenant.id);
  const finishDeploy = runFinishDeploy.bind(null, tenant.id);
  const railwayProjectUrl = tenant.railwayProjectId ? `https://railway.com/project/${tenant.railwayProjectId}` : null;

  return (
    <div className="space-y-6">
      <PageHeader title={tenant.name} description={tenant.brandName} />

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
                <div>
                  <dt className="inline font-medium">Modpas Tanporè: </dt>
                  <dd className="inline font-mono">{tenant.adminTempPassword}</dd>
                </div>
              )}
            </dl>
            <p className="mt-2 text-xs text-emerald-600">Bay admin tenant la enfòmasyon sa yo yon sèl fwa — mande yo chanje modpas la apre premye koneksyon.</p>
          </div>
        )}
      </Card>

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
