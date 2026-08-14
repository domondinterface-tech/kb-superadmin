import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { logout } from "@/lib/actions/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-sm font-semibold text-slate-900">
            KB SuperAdmin
          </Link>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span>{user.name}</span>
            <form action={logout}>
              <button type="submit" className="font-medium text-slate-700 hover:underline">
                Dekonekte
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
