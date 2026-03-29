import { NextRequest, NextResponse } from "next/server";
import { db, eq } from "@/lib/db";
import { inngest } from "@/inngest/client";
import { validateWebhookSignature } from "@/lib/asaas";

// ─── Webhook payload types ────────────────────────────────────────────────────

interface AsaasWebhookPayload {
  event: "PAYMENT_CREATED" | "PAYMENT_CONFIRMED" | "PAYMENT_OVERDUE" | "PAYMENT_DELETED";
  payment: {
    id: string;
    customer: string;
    value: number;
    dueDate: string;
    status: string;
    billingType: string;
    pixQrCode?: string;
    pixCopyCode?: string;
    paymentUrl?: string;
  };
}

// ─── POST /api/webhooks/asaas ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("asaas-signature") ?? "";

  if (!validateWebhookSignature(rawBody, signature)) {
    console.warn("[Asaas Webhook] Assinatura inválida");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: AsaasWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log(`[Asaas Webhook] Evento: ${payload.event}, Payment: ${payload.payment?.id}`);

  try {
    switch (payload.event) {
      case "PAYMENT_CREATED":
        await handlePaymentCreated(payload);
        break;
      case "PAYMENT_CONFIRMED":
        await handlePaymentConfirmed(payload);
        break;
      case "PAYMENT_OVERDUE":
        await handlePaymentOverdue(payload);
        break;
      default:
        console.log(`[Asaas Webhook] Evento ignorado: ${payload.event}`);
    }
  } catch (err) {
    console.error("[Asaas Webhook] Erro ao processar webhook:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

const DEMO_USER_ID = "demo-user";

async function handlePaymentCreated(payload: AsaasWebhookPayload) {
  const { payment } = payload;

  // Idempotency: check if payment already exists
  const existing = db.select().from("pixflow_payments").where(eq("asaas_payment_id", payment.id), payment.id).limit(1).all();
  if (existing.length > 0) {
    console.log(`[Asaas Webhook] Payment ${payment.id} já existe, ignorando.`);
    return;
  }

  // Find or create customer
  let customerId: number;
  const existingCustomer = db.select().from("pixflow_customers").where(eq("asaas_customer_id", payment.customer), payment.customer).limit(1).all();

  if (existingCustomer.length > 0) {
    customerId = existingCustomer[0].id;
  } else {
    const [created] = db.insert("pixflow_customers").values([{
      userId: DEMO_USER_ID,
      name: `Cliente ${payment.customer.slice(-4)}`,
      phone: "5511999999999",
      isActive: true,
    }]).returning().all();
    if (!created) throw new Error("Falha ao criar cliente");
    customerId = created.id;
  }

  // Create payment record
  const paymentRows = db.insert("pixflow_payments").values([{
    userId: DEMO_USER_ID,
    customerId,
    asaasPaymentId: payment.id,
    amount: payment.value.toString(),
    status: payment.status === "OVERDUE" ? "OVERDUE" : "PENDING",
    dueDate: payment.dueDate,
    pixQrCode: payment.pixQrCode ?? null,
    pixCopyCode: payment.pixCopyCode ?? null,
    paymentUrl: payment.paymentUrl ?? null,
  }]).returning().all();
    if (paymentRows.length === 0 || !paymentRows[0]) throw new Error("Falha ao criar pagamento");
    const np = paymentRows[0];
    console.log(`[Asaas Webhook] Payment ${payment.id} criado (id: ${np.id})`);

  // Schedule follow-ups
  const dueDate = new Date(payment.dueDate);
  const schedules = [];
  for (const [step, days] of [["D3", 3], ["D7", 7], ["D14", 14]] as const) {
    const sf = new Date(dueDate);
    sf.setDate(sf.getDate() + days);
    schedules.push({
      paymentId: np.id,
      userId: DEMO_USER_ID,
      customerId,
      step,
      scheduledFor: sf.toISOString(),
      status: "PENDING",
    });
  }
  db.insert("pixflow_follow_up_schedules").values(schedules).returning();

  console.log(`[Asaas Webhook] 3 lembretes agendados para payment ${np.id}`);
}

async function handlePaymentConfirmed(payload: AsaasWebhookPayload) {
  const { payment } = payload;

  db.update("pixflow_payments")
    .set({ status: "CONFIRMED", paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .where(eq("asaas_payment_id", payment.id), payment.id)
    .returning();

  db.update("pixflow_follow_up_schedules")
    .set({ status: "SKIPPED" })
    .where(eq("status", "PENDING"), "PENDING")
    .returning();

  console.log(`[Asaas Webhook] Payment ${payment.id} confirmado — lembretes cancelados.`);
}

async function handlePaymentOverdue(payload: AsaasWebhookPayload) {
  const { payment } = payload;

  db.update("pixflow_payments")
    .set({ status: "OVERDUE", updated_at: new Date().toISOString() })
    .where(eq("asaas_payment_id", payment.id), payment.id)
    .returning();

  console.log(`[Asaas Webhook] Payment ${payment.id} marcado como OVERDUE.`);
}
