"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Avatar } from "@/components/ui";
import { toggleTenantActive } from "@/lib/actions/tenants";
import type { TenantStatus } from "@/generated/prisma/enums";

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

type TenantRow = {
  id: string;
  name: string;
  brandName: string;
  adminEmail: string;
  status: TenantStatus;
  active: boolean;
  createdAt: Date;
};

export function TenantsTable({ tenants }: { tenants: TenantRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter(
      (t) => t.name.toLowerCase().includes(q) || t.brandName.toLowerCase().includes(q) || t.adminEmail.toLowerCase().includes(q),
    );
  }, [tenants, query]);

  return (
    <div>
      <div className="mb-4 relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Chèche pa non, mak, oswa imèl..."
          className="w-full max-w-sm rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">Pa gen tenant ki matche rechèch la.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-4">Tenant</th>
                <th className="pb-2 pr-4">Imèl Admin</th>
                <th className="pb-2 pr-4">Estati</th>
                <th className="pb-2 pr-4">Aktif</th>
                <th className="pb-2 pr-4">Kreye</th>
                <th className="pb-2 text-right">Aksyon</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const toggle = toggleTenantActive.bind(null, t.id);
                return (
                  <tr key={t.id} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={t.name} seed={t.id} />
                        <div className="min-w-0">
                          <Link href={`/tenants/${t.id}`} className="block truncate font-medium text-slate-900 hover:text-indigo-600 dark:text-white">
                            {t.name}
                          </Link>
                          <div className="truncate text-xs text-slate-500">{t.brandName}</div>
                        </div>
                      </div>
                    </td>
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
                    <td className="py-3 pr-4 text-slate-500">{t.createdAt.toLocaleDateString("fr-HT")}</td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/tenants/${t.id}`}
                        title="Wè detay"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
