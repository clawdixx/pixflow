import { inngest } from "../client";
import { db, eq } from "@/lib/db";
import { d3Message, d7Message, d14Message } from "@/lib/messages";
import { sendTextMessage } from "@/lib/zapi";

/**
 * Quando um pagamento é criado, agenda os 3 lembretes (D3, D7, D14).
 */
export const scheduleFollowUps = inngest.createFunction(
  { id: "schedule-follow-ups", retries: 3 },
  { event: "payment/created" },
  async ({ event, step }) => {
    const { paymentId, userId, customerId, dueDate } = event.data;

    await step.run("create-follow-up-records", async () => {
      const due = new Date(dueDate);
      const schedules = [];

      for (const [step, days] of [["D3", 3], ["D7", 7], ["D14", 14]] as const) {
        const sf = new Date(due);
        sf.setDate(sf.getDate() + days);
        schedules.push({
          paymentId,
          userId,
          customerId,
          step,
          scheduledFor: sf.toISOString(),
          status: "PENDING",
        });
      }

      db.insert("pixflow_follow_up_schedules").values(schedules).returning().all();
      console.log(`[Pixflow] Agendados ${schedules.length} lembretes para payment ${paymentId}`);
    });
  }
);

/**
 * Verifica lembretes pendentes whose scheduledFor <= now and sends them.
 * Runs every 5 min via Inngest cron (or triggered manually).
 */
export const checkAndSendReminders = inngest.createFunction(
  { id: "check-and-send-reminders", retries: 3, concurrency: 2 },
  { event: "check/reminders" },
  async ({ event: _event, step }) => {
    const now = new Date().toISOString();

    const pendingSchedules = await step.run("fetch-pending-schedules", async () => {
      return db
        .select()
        .from("pixflow_follow_up_schedules")
        .where(eq("status", "PENDING"), "PENDING")
        .all()
        .filter((s: Record<string, unknown>) => (s.scheduledFor as string) <= now);
    });

    if (pendingSchedules.length === 0) {
      console.log("[Pixflow] Nenhum lembrete pendente para envio agora.");
      return { sent: 0 };
    }

    const results = await step.run("send-reminders", async () => {
      const outcomes: { scheduleId: number; success: boolean }[] = [];

      for (const schedule of pendingSchedules.slice(0, 10)) {
        // Fetch payment + customer
        const [payment] = db.select().from("pixflow_payments").where(eq("id", schedule.paymentId), schedule.paymentId).limit(1).all();
        const [customer] = db.select().from("pixflow_customers").where(eq("id", schedule.customerId), schedule.customerId).limit(1).all();

        if (!payment || !customer) {
          console.warn(`[Pixflow] Payment ${schedule.paymentId} ou Customer não encontrado. Pulando.`);
          continue;
        }

        // Build message
        const messageFn = schedule.step === "D3" ? d3Message
          : schedule.step === "D7" ? d7Message
          : d14Message;

        const content = messageFn({
          customerName: String(customer.name),
          amount: Number(payment.amount),
          dueDate: String(payment.dueDate),
          pixCopyCode: payment.pixCopyCode ?? undefined,
          paymentUrl: payment.paymentUrl ?? undefined,
        });

        // Send via Z-API
        const result = await sendTextMessage(String(customer.phone), content);

        if (result.messageId) {
          db.update("pixflow_follow_up_schedules")
            .set({ status: "SENT", sent_at: new Date().toISOString() })
            .where(eq("id", schedule.id), schedule.id)
            .returning();

          db.insert("pixflow_follow_up_messages").values([{
            followUpScheduleId: schedule.id,
            customerId: schedule.customerId,
            paymentId: schedule.paymentId,
            userId: schedule.userId,
            messageType: schedule.step,
            content,
            zapiMessageId: result.messageId,
            zapiStatus: result.status,
            sentAt: new Date().toISOString(),
          }]).returning().all();

          console.log(`[Pixflow] ✅ D${schedule.step} enviado para ${customer.name} (${customer.phone})`);
        } else {
          console.error(`[Pixflow] ❌ Falha ao enviar D${schedule.step} para ${customer.name}`);
        }

        outcomes.push({ scheduleId: schedule.id, success: !!result.messageId });
      }

      return outcomes;
    });

    return { sent: results.filter((r: { success: boolean }) => r.success).length };
  }
);
