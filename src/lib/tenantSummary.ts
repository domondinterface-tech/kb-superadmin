// Fetches a small financial snapshot from a tenant's own KB Books instance,
// via a header-authenticated route (no cookie session — this runs server-side
// on the SuperAdmin app, not in the tenant admin's browser). See
// myaccountingapp's src/app/api/superadmin/summary/route.ts for the other
// side of this contract.

export type TenantSummary = {
  brand: string;
  cashHTG: number;
  cashUSD: number;
  totalAsset: number;
  netProfit: number;
  isBalanced: boolean;
};

export type TenantSummaryResult = { ok: true; data: TenantSummary } | { ok: false; error: string };

export async function fetchTenantSummary(appUrl: string): Promise<TenantSummaryResult> {
  const key = process.env.SUPERADMIN_API_KEY;
  if (!key) {
    return { ok: false, error: "SUPERADMIN_API_KEY pa konfigire sou sèvè SuperAdmin la." };
  }

  try {
    const res = await fetch(`${appUrl}/api/superadmin/summary`, {
      headers: { "x-superadmin-key": key },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });

    if (!res.ok) {
      return { ok: false, error: `Enstans lan reponn ak HTTP ${res.status}.` };
    }

    const data = (await res.json()) as TenantSummary;
    return { ok: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Pa t ka kontakte enstans lan: ${message}` };
  }
}
