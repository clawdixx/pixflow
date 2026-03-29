import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "pixflow",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

// ─── Event Types ─────────────────────────────────────────────────────────────

export interface PaymentCreatedEvent {
  name: "payment/created";
  data: {
    userId: string;
    paymentId: number;
    customerId: number;
    dueDate: string;
  };
}

export interface CheckRemindersEvent {
  name: "check/reminders";
  data: {
    // triggerd by cron or manual
  };
}

export type AppEvents = PaymentCreatedEvent | CheckRemindersEvent;
