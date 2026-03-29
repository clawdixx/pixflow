"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6 text-center">
        {/* Logo */}
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600 text-white text-2xl font-bold shadow-lg">
            P
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Pixflow</h1>
          <p className="text-gray-500 text-sm">
            Follow-up de pagamentos via WhatsApp para freelancers brasileiros
          </p>
        </div>

        {/* CTA */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Modelo de demonstração com dados simulados (Asaas + Z-API em modo mock).
          </p>
          <Link
            href="/dashboard"
            className="block w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-colors"
          >
            Abrir Dashboard
          </Link>
          <div className="flex gap-3">
            <button
              onClick={async () => {
                const res = await fetch("/api/seed", { method: "POST" });
                const data = await res.json();
                alert(data.message ?? JSON.stringify(data));
              }}
              className="flex-1 py-2 px-3 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-sm transition-colors"
            >
              Seed Demo Data
            </button>
            <button
              onClick={async () => {
                await fetch("/api/seed", { method: "POST" });
                window.location.href = "/dashboard";
              }}
              className="flex-1 py-2 px-3 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-xl text-sm transition-colors"
            >
              Seed + Abrir
            </button>
          </div>
        </div>

        {/* Stack info */}
        <div className="text-xs text-gray-400 space-y-1">
          <p>Next.js 16 · Drizzle ORM · Neon PostgreSQL · Inngest · Z-API</p>
          <p>Modo mock: ASAAS_MOCK=true, ZAPI_MOCK=true</p>
        </div>
      </div>
    </div>
  );
}
