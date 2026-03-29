"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Customer {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
}

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/customers?userId=demo-user");
    const data = await res.json();
    setCustomers(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ name: "", email: "", phone: "", notes: "" });
      setShowForm(false);
      load();
    }
    setSaving(false);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie os clientes que recebem follow-up</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          {showForm ? "Cancelar" : "+ Novo Cliente"}
        </button>
      </div>

      {/* New Client Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Novo Cliente</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Maria da Silva"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp *</label>
              <input
                required
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="5511999990001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="maria@exemplo.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Designer freelance"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
          >
            {saving ? "Salvando..." : "Salvar Cliente"}
          </button>
        </form>
      )}

      {/* Customer List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : customers.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          Nenhum cliente cadastrado ainda.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Nome</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Contato</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Notas</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Desde {formatDate(c.createdAt)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-700">{c.phone}</p>
                    {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{c.notes ?? "—"}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {c.isActive ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/dashboard/clientes/${c.id}`}
                      className="text-sm text-violet-600 hover:text-violet-700 font-medium"
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
