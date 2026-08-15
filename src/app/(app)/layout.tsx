import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { logout } from "@/lib/actions/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">KB</span>
            <span className="text-sm font-semibold text-slate-900">SuperAdmin</span>
          </Link>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span className="hidden sm:inline">{user.name}</span>
            <form action={logout}>
              <button type="submit" className="font-medium text-slate-700 transition-colors hover:text-indigo-600">
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
