/**
 * Pixflow Data Model — Type Definitions
 *
 * These are the canonical TypeScript types for the Pixflow domain model.
 * They document the expected shape of all entities without depending on Drizzle.
 *
 * In production (Neon PostgreSQL), these types would be generated from
 * the Drizzle schema using `drizzle-kit generate`.
 *
 * Table naming convention: pixflow_{plural_name}
 * Column naming convention: snake_case
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type PaymentStatus = "PENDING" | "OVERDUE" | "CONFIRMED" | "CANCELLED";
export type FollowUpStep = "D3" | "D7" | "D14";
export type FollowUpStatus = "PENDING" | "SENT" | "SKIPPED" | "PAUSED";
export type ZApiMessageStatus = "QUEUED" | "SENT" | "DELIVERED" | "READ" | "FAILED";

// ─── Entities ────────────────────────────────────────────────────────────────

/** Freelancer / usuário principal (tenant) */
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  /** Asaas integration */
  asaasApiKey: string | null;
  /** Z-API (WhatsApp) integration */
  zapiInstanceId: string | null;
  zapiToken: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/** Cliente do freelancer (devedor) */
export interface Customer {
  id: number;
  userId: string;
  name: string;
  email: string | null;
  phone: string; // WhatsApp number (DDD + número)
  /** ID do cliente no Asaas */
  asaasCustomerId: string | null;
  notes: string | null;
  /** Se inativo, não recebe mais lembretes */
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/** Pagamento Asaas */
export interface Payment {
  id: number;
  userId: string;
  customerId: number;
  /** ID do pagamento no Asaas */
  asaasPaymentId: string | null;
  amount: string; // decimal as string to preserve precision
  status: PaymentStatus;
  dueDate: Date | string;
  paidAt: Date | string | null;
  /** Dados Pix (retornados pelo Asaas) */
  pixQrCode: string | null;
  pixCopyCode: string | null;
  paymentUrl: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/** Agenda de lembretes — um registro por step (D3, D7, D14) */
export interface FollowUpSchedule {
  id: number;
  paymentId: number;
  userId: string;
  customerId: number;
  /** Step: D3 = dia 3 após vencimento, D7 = dia 7, D14 = dia 14 */
  step: FollowUpStep;
  scheduledFor: Date | string;
  sentAt: Date | string | null;
  status: FollowUpStatus;
  createdAt: Date | string;
}

/** Log de mensagens enviadas via Z-API */
export interface FollowUpMessage {
  id: number;
  followUpScheduleId: number | null;
  customerId: number;
  paymentId: number;
  userId: string;
  /** Tipo: qual step ou mensagem manual */
  messageType: FollowUpStep;
  content: string;
  /** ID retornado pela Z-API */
  zapiMessageId: string | null;
  zapiStatus: ZApiMessageStatus;
  sentAt: Date | string | null;
  createdAt: Date | string;
}
