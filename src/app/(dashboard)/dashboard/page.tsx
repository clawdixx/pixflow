"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

type PaymentStatus = "PENDING" | "OVERDUE" | "CONFIRMED" | "CANCELLED";
type ScheduleStep = "D3" | "D7" | "D14";
type ScheduleStatus = "PENDING" | "SENT" | "SKIPPED" | "PAUSED";

interface Schedule {
  id: number;
  step: ScheduleStep;
  scheduledFor: string;
  sentAt: string | null;
  status: ScheduleStatus;
}

interface Payment {
  id: number;
  asaasPaymentId: string | null;
  amount: string;
  status: PaymentStatus;
  dueDate: string;
  paidAt: string | null;
  pixCopyCode: string | null;
  paymentUrl: string | null;
  customerId: number;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string | null;
}

interface PaymentWithMeta {
  payment: Payment;
  customer: Customer;
  schedules: Schedule[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value: string): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const STATUS_STYLES: Record<PaymentStatus, { label: string; className: string }> = {
  PENDING: { label: "Pendente", className: "bg-blue-50 text-blue-700 border-blue-200" },
  OVERDUE: { label: "Vencido", className: "bg-red-50 text-red-700 border-red-200" },
  CONFIRMED: { label: "Pago", className: "bg-green-50 text-green-700 border-green-200" },
  CANCELLED: { label: "Cancelado", className: "bg-gray-50 text-gray-500 border-gray-200" },
};

const STEP_STYLES: Record<ScheduleStep, { label: string; days: number }> = {
  D3: { label: "Dia 3", days: 3 },
  D7: { label: "Dia 7", days: 7 },
  D14: { label: "Dia 14", days: 14 },
};

const SCHEDULE_STATUS_STYLES: Record<ScheduleStatus, { label: string; className: string }> = {
  PENDING: { label: "Agendado", className: "text-blue-600 bg-blue-50" },
  SENT: { label: "Enviado ✅", className: "text-green-600 bg-green-50" },
  SKIPPED: { label: "Ignorado", className: "text-gray-500 bg-gray-50" },
  PAUSED: { label: "Pausado ⏸", className: "text-yellow-600 bg-yellow-50" },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [payments, setPayments] = useState<PaymentWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PaymentStatus | "ALL">("ALL");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function loadPayments() {
    setLoading(true);
    const res = await fetch("/api/payments?userId=demo-user");
    const data = await res.json();
    setPayments(data);
    setLoading(false);
  }

  useEffect(() => {
    loadPayments();
  }, []);

  async function pausePayment(paymentId: number) {
    setActionLoading(paymentId);
    try {
      const res = await fetch(`/api/payments/${paymentId}/pause`, { method: "POST" });
      if (res.ok) {
        showToast("Lembretes pausados.");
        await loadPayments();
      } else {
        showToast("Erro ao pausar.", "error");
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function resumePayment(paymentId: number) {
    setActionLoading(paymentId);
    try {
      const res = await fetch(`/api/payments/${paymentId}/resume`, { method: "POST" });
      if (res.ok) {
        showToast("Lembretes retomados!");
        await loadPayments();
      } else {
        showToast("Erro ao retomar.", "error");
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function triggerCheckReminders() {
    showToast("Disparando verificação de lembretes...");
    // In real app, this would send an Inngest event
    // For demo, we just reload
    setTimeout(() => loadPayments(), 500);
  }

  const filtered = payments.filter(
    (p) => filter === "ALL" || p.payment.status === filter
  );

  const stats = {
    total: payments.length,
    overdue: payments.filter((p) => p.payment.status === "OVERDUE").length,
    pending: payments.filter((p) => p.payment.status === "PENDING").length,
    paid: payments.filter((p) => p.payment.status === "CONFIRMED").length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pagamentos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Acompanhe os lembretes de pagamento dos seus clientes
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={triggerCheckReminders}
            className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-sm transition-colors"
          >
            🔄 Verificar Lembretes
          </button>
          <button
            onClick={async () => {
              await fetch("/api/seed", { method: "POST" });
              loadPayments();
              showToast("Dados de demo recriados!");
            }}
            className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-sm transition-colors"
          >
            ↺ Reset Demo
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, color: "gray" },
          { label: "Pendentes", value: stats.pending, color: "blue" },
          { label: "Vencidos", value: stats.overdue, color: "red" },
          { label: "Pagos", value: stats.paid, color: "green" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 text-${s.color}-600`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["ALL", "OVERDUE", "PENDING", "CONFIRMED", "CANCELLED"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f
                ? "bg-violet-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f === "ALL" ? "Todos" : STATUS_STYLES[f]?.label ?? f}
          </button>
        ))}
      </div>

      {/* Payments List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          Nenhum pagamento encontrado.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(({ payment, customer, schedules }) => {
            const statusStyle = STATUS_STYLES[payment.status];
            const isPaused = schedules.some((s) => s.status === "PAUSED");
            const isActive = payment.status !== "CONFIRMED" && payment.status !== "CANCELLED";
            const days = daysUntil(payment.dueDate);

            return (
              <div
                key={payment.id}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow"
              >
                {/* Card Header */}
                <div className="px-6 py-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 truncate">{customer.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusStyle.className}`}>
                        {statusStyle.label}
                      </span>
                      {isPaused && (
                        <span className="text-xs px-2 py-0.5 rounded-full border font-medium text-yellow-600 bg-yellow-50 border-yellow-200">
                          Pausado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-500">
                      <span>{customer.email ?? customer.phone}</span>
                      <span className="text-gray-300">·</span>
                      <span>Vence em {days > 0 ? `${days}d` : `há ${Math.abs(days)}d`}</span>
                      <span className="text-gray-300">·</span>
                      <span>{formatDate(payment.dueDate)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(payment.amount)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Pix: {payment.asaasPaymentId ?? "—"}
                    </p>
                  </div>
                </div>

                {/* Follow-up Timeline */}
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                    Sequência de Lembretes
                  </p>
                  <div className="flex gap-3">
                    {(["D3", "D7", "D14"] as ScheduleStep[]).map((step) => {
                      const schedule = schedules.find((s) => s.step === step);
                      if (!schedule) {
                        return (
                          <div key={step} className="flex-1 text-center py-2 bg-gray-100 rounded-lg">
                            <p className="text-xs text-gray-400">{STEP_STYLES[step].label}</p>
                            <p className="text-xs text-gray-300 mt-0.5">—</p>
                          </div>
                        );
                      }
                      const sStyle = SCHEDULE_STATUS_STYLES[schedule.status];
                      return (
                        <div key={step} className="flex-1 text-center py-2 rounded-lg border border-gray-200 bg-white">
                          <p className="text-xs font-medium text-gray-700">{STEP_STYLES[step].label}</p>
                          <p className={`text-xs mt-0.5 font-medium ${sStyle.className}`}>
                            {sStyle.label}
                          </p>
                          {schedule.sentAt && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {formatDate(schedule.sentAt)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                {isActive && (
                  <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
                    <Link
                      href={`/dashboard/clientes/${customer.id}`}
                      className="text-sm text-violet-600 hover:text-violet-700 font-medium"
                    >
                      Ver cliente →
                    </Link>
                    <div className="flex gap-2">
                      {isPaused ? (
                        <button
                          onClick={() => resumePayment(payment.id)}
                          disabled={actionLoading === payment.id}
                          className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                        >
                          {actionLoading === payment.id ? "Retomando..." : "▶ Retomar Lembretes"}
                        </button>
                      ) : (
                        <button
                          onClick={() => pausePayment(payment.id)}
                          disabled={actionLoading === payment.id}
                          className="px-4 py-1.5 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 text-sm rounded-lg transition-colors"
                        >
                          {actionLoading === payment.id ? "Pausando..." : "⏸ Pausar Lembretes"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
