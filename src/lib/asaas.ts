/**
 * Asaas API client
 * Docs: https://docs.asaas.com/reference/
 *
 * Modo mock: quando ASAAS_MOCK=true, retorna dados simulados
 * sem fazer requisições reais à API do Asaas.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpfCnpj: string;
}

export interface AsaasPayment {
  id: string;
  customer: string; // asaas customer id
  billingType: "PIX" | "BOLETO" | "CREDIT_CARD";
  value: number;
  dueDate: string;
  status: "PENDING" | "RECEIVED" | "OVERDUE" | "CONFIRMED" | "CANCELLED";
  pixQrCode?: string;
  pixCopyCode?: string;
  paymentUrl?: string;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_CUSTOMERS: AsaasCustomer[] = [
  { id: "cus_mock_001", name: "Maria da Silva", email: "maria@exemplo.com", phone: "11999990001", cpfCnpj: "12345678901" },
  { id: "cus_mock_002", name: "João Santos", email: "joao@exemplo.com", phone: "11999990002", cpfCnpj: "98765432100" },
  { id: "cus_mock_003", name: "Ana Costa", email: "ana@exemplo.com", phone: "11999990003", cpfCnpj: "45678912300" },
];

const MOCK_PAYMENTS: AsaasPayment[] = [
  {
    id: "pay_mock_001",
    customer: "cus_mock_001",
    billingType: "PIX",
    value: 850.0,
    dueDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 4 dias atrás (OVERDUE)
    status: "OVERDUE",
    pixQrCode: "00020126580014br.gov.bcb.pix0136{a1b2c3d4}5204000053039865802BR5925PIXFLOW6009SAO PAULO62070503***6304",
    pixCopyCode: "00020126580014br.gov.bcb.pix0136{a1b2c3d4}5204000053039865802BR",
    paymentUrl: "https://www.asaas.com/c/pay_mock_001",
  },
  {
    id: "pay_mock_002",
    customer: "cus_mock_002",
    billingType: "PIX",
    value: 1200.0,
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // em 3 dias
    status: "PENDING",
    pixQrCode: "00020126580014br.gov.bcb.pix0136{e5f6g7h8}5204000053039865802BR5925PIXFLOW6009SAO PAULO62070503***6305",
    pixCopyCode: "00020126580014br.gov.bcb.pix0136{e5f6g7h8}5204000053039865802BR",
    paymentUrl: "https://www.asaas.com/c/pay_mock_002",
  },
  {
    id: "pay_mock_003",
    customer: "cus_mock_003",
    billingType: "PIX",
    value: 450.0,
    dueDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 8 dias atrás
    status: "OVERDUE",
    pixQrCode: "00020126580014br.gov.bcb.pix0136{i9j0k1l2}5204000053039865802BR5925PIXFLOW6009SAO PAULO62070503***6306",
    pixCopyCode: "00020126580014br.gov.bcb.pix0136{i9j0k1l2}5204000053039865802BR",
    paymentUrl: "https://www.asaas.com/c/pay_mock_003",
  },
];

// ─── Client ──────────────────────────────────────────────────────────────────

const ASAAS_BASE_URL = "https://www.asaas.com/api/v3";
const IS_MOCK = process.env.ASAAS_MOCK === "true";

function getHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.ASAAS_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function getCustomer(asaasCustomerId: string): Promise<AsaasCustomer | null> {
  if (IS_MOCK) {
    return MOCK_CUSTOMERS.find((c) => c.id === asaasCustomerId) ?? null;
  }
  const res = await fetch(`${ASAAS_BASE_URL}/customers/${asaasCustomerId}`, {
    headers: getHeaders(),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
    email: data.email ?? "",
    phone: data.phone ?? "",
    cpfCnpj: data.cpfCnpj ?? "",
  };
}

export async function getPayment(asaasPaymentId: string): Promise<AsaasPayment | null> {
  if (IS_MOCK) {
    return MOCK_PAYMENTS.find((p) => p.id === asaasPaymentId) ?? null;
  }
  const res = await fetch(`${ASAAS_BASE_URL}/payments/${asaasPaymentId}`, {
    headers: getHeaders(),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    id: data.id,
    customer: data.customer,
    billingType: data.billingType,
    value: data.value,
    dueDate: data.dueDate,
    status: data.status,
    pixQrCode: data.pixQrCode,
    pixCopyCode: data.pixCopyCode,
    paymentUrl: data.paymentUrl,
  };
}

export async function createPayment(params: {
  customerId: string;
  value: number;
  dueDate: string;
}): Promise<AsaasPayment> {
  if (IS_MOCK) {
    const newPayment: AsaasPayment = {
      id: `pay_mock_${Date.now()}`,
      customer: params.customerId,
      billingType: "PIX",
      value: params.value,
      dueDate: params.dueDate,
      status: "PENDING",
      pixQrCode: `00020126580014br.gov.bcb.pix0136 mock ${Date.now()}`,
      pixCopyCode: `MOCK${Date.now()}`,
      paymentUrl: `https://www.asaas.com/c/mock_${Date.now()}`,
    };
    MOCK_PAYMENTS.push(newPayment);
    return newPayment;
  }
  const res = await fetch(`${ASAAS_BASE_URL}/payments`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      customer: params.customerId,
      billingType: "PIX",
      value: params.value,
      dueDate: params.dueDate,
    }),
  });
  if (!res.ok) throw new Error(`Asaas API error: ${res.status}`);
  return res.json();
}

/** Validate Asaas webhook signature */
export function validateWebhookSignature(
  payload: string,
  signature: string
): boolean {
  if (IS_MOCK) return true;
  // Asaas uses HMAC-SHA256
  const crypto = require("crypto");
  const expected = crypto
    .createHmac("sha256", process.env.ASAAS_WEBHOOK_TOKEN!)
    .update(payload)
    .digest("hex");
  return signature === expected;
}
