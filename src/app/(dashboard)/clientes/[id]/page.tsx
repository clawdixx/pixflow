"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Payment {
  id: number;
  amount: string;
  status: string;
  dueDate: string;
  pixCopyCode: string | null;
  paymentUrl: string | null;
}

interface Schedule {
  id: number;
  step: string;
  scheduledFor: string;
  sentAt: string | null;
  status: string;
}

interface Customer {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  notes: string | null;
  isActive: boolean;
}

function formatCurrency(value: string): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(dateStr));
}

export default function ClienteDetailPage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [payments, setPayments] = useState<{ payment: Payment; schedules: Schedule[] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [custRes, payRes] = await Promise.all([
        fetch(`/api/customers/${id}`),
        fetch(`/api/payments?customerId=${id}`),
      ]);
      const custData = await custRes.json();
      const payData = await payRes.json();
      setCustomer(custData);
      setPayments(payData);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-gray-400">Carregando...</div>;
  if (!customer) return <div className="p-8 text-center text-red-400">Cliente não encontrado.</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back */}
      <Link href="/dashboard/clientes" className="inline-flex items-center text-sm text-gray-500 hover:text-violet-600">
        ← Clientes
      </Link>

      {/* Customer Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${customer.isActive ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
                {customer.isActive ? "Ativo" : "Inativo"}
              </span>
            </div>
            <div className="mt-2 space-y-1 text-sm text-gray-500">
              <p>📱 {customer.phone}</p>
              {customer.email && <p>✉️ {customer.email}</p>}
            </div>
            {customer.notes && (
              <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2">{customer.notes}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Total de pagamentos</p>
            <p className="text-2xl font-bold text-gray-900">{payments.length}</p>
          </div>
        </div>
      </div>

      {/* Payments */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Pagamentos</h2>
        {payments.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-white rounded-2xl border border-gray-200">
            Nenhum pagamento registrado para este cliente.
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map(({ payment, schedules }) => {
              const STATUS_MAP: Record<string, { label: string; cls: string }> = {
                PENDING: { label: "Pendente", cls: "bg-blue-50 text-blue-700 border-blue-200" },
                OVERDUE: { label: "Vencido", cls: "bg-red-50 text-red-700 border-red-200" },
                CONFIRMED: { label: "Pago", cls: "bg-green-50 text-green-700 border-green-200" },
                CANCELLED: { label: "Cancelado", cls: "bg-gray-100 text-gray-500" },
              };
              const st = STATUS_MAP[payment.status] ?? STATUS_MAP.PENDING;
              return (
                <div key={payment.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{formatCurrency(payment.amount)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${st.cls}`}>{st.label}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">Venceu: {formatDate(payment.dueDate)}</p>
                    </div>
                    {payment.pixCopyCode && (
                      <div className="text-right">
                        <p className="text-xs text-gray-400 mb-1">Código Pix</p>
                        <p className="text-xs font-mono bg-gray-50 px-2 py-1 rounded text-gray-600 max-w-[160px] truncate">
                          {payment.pixCopyCode.slice(0, 30)}...
                        </p>
                      </div>
                    )}
                  </div>
                  {/* Schedule Timeline */}
                  <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex gap-3">
                    {(["D3", "D7", "D14"] as const).map((step) => {
                      const SCHED_MAP: Record<string, string> = {
                        PENDING: "⏳ Agendado",
                        SENT: "✅ Enviado",
                        SKIPPED: "⛔ Ignorado",
                        PAUSED: "⏸ Pausado",
                      };
                      const s = schedules.find((sc) => sc.step === step);
                      return (
                        <div key={step} className="flex-1 text-center">
                          <p className="text-xs font-medium text-gray-600">{step === "D3" ? "Dia 3" : step === "D7" ? "Dia 7" : "Dia 14"}</p>
                          <p className={`text-xs mt-0.5 ${s ? "text-gray-700" : "text-gray-300"}`}>
                            {s ? SCHED_MAP[s.status] ?? s.status : "—"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
