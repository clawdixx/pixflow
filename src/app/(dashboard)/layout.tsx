import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center text-sm font-bold">
                P
              </div>
              <span className="font-semibold text-gray-900">Pixflow</span>
              <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">
                Demo
              </span>
            </div>
            <nav className="flex items-center gap-6">
              <Link href="/dashboard" className="text-sm font-medium text-gray-900 hover:text-violet-600 transition-colors">
                Pagamentos
              </Link>
              <Link href="/dashboard/clientes" className="text-sm font-medium text-gray-500 hover:text-violet-600 transition-colors">
                Clientes
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
