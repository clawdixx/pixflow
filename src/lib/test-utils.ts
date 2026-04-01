/**
 * Test utilities and mocks for Pixflow tests
 */

// ─── Mock Database ───────────────────────────────────────────────────────────

export interface MockPayment {
  id: number;
  userId: string;
  customerId: number;
  asaasPaymentId: string;
  amount: string;
  status: string;
  dueDate: string;
  paidAt: string | null;
  pixQrCode: string | null;
  pixCopyCode: string | null;
  paymentUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MockCustomer {
  id: number;
  userId: string;
  name: string;
  email: string | null;
  phone: string;
  asaasCustomerId: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MockFollowUpSchedule {
  id: number;
  paymentId: number;
  userId: string;
  customerId: number;
  step: string;
  scheduledFor: string;
  sentAt: string | null;
  status: string;
  createdAt: string;
}

// In-memory mock database
class MockDatabase {
  users: Map<string, { id: string; name: string; email: string }> = new Map();
  customers: MockCustomer[] = [];
  payments: MockPayment[] = [];
  followUpSchedules: MockFollowUpSchedule[] = [];
  followUpMessages: Map<number, unknown> = new Map();

  private nextCustomerId = 1;
  private nextPaymentId = 1;
  private nextScheduleId = 1;
  private nextMessageId = 1;

  reset() {
    this.customers = [];
    this.payments = [];
    this.followUpSchedules = [];
    this.followUpMessages = new Map();
    this.nextCustomerId = 1;
    this.nextPaymentId = 1;
    this.nextScheduleId = 1;
    this.nextMessageId = 1;
  }

  addCustomer(data: Omit<MockCustomer, "id">): MockCustomer {
    const customer: MockCustomer = { ...data, id: this.nextCustomerId++ };
    this.customers.push(customer);
    return customer;
  }

  addPayment(data: Omit<MockPayment, "id">): MockPayment {
    const payment: MockPayment = { ...data, id: this.nextPaymentId++ };
    this.payments.push(payment);
    return payment;
  }

  addSchedule(data: Omit<MockFollowUpSchedule, "id">): MockFollowUpSchedule {
    const schedule: MockFollowUpSchedule = { ...data, id: this.nextScheduleId++ };
    this.followUpSchedules.push(schedule);
    return schedule;
  }

  findCustomersByAsaasId(asaasId: string): MockCustomer[] {
    return this.customers.filter((c) => c.asaasCustomerId === asaasId);
  }

  findPaymentsByAsaasId(asaasId: string): MockPayment[] {
    return this.payments.filter((p) => p.asaasPaymentId === asaasId);
  }

  findSchedulesByPaymentId(paymentId: number): MockFollowUpSchedule[] {
    return this.followUpSchedules.filter((s) => s.paymentId === paymentId);
  }

  updateSchedulesByPaymentId(paymentId: number, updates: Partial<MockFollowUpSchedule>) {
    this.followUpSchedules = this.followUpSchedules.map((s) =>
      s.paymentId === paymentId ? { ...s, ...updates } : s
    );
  }
}

export const mockDb = new MockDatabase();

// ─── Mock Inngest Step ───────────────────────────────────────────────────────

export interface MockStepRun {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run(name: string, fn: () => any | Promise<any>): Promise<any>;
}

export function createMockStepRun(): MockStepRun {
  return {
    async run(_name: string, fn: () => unknown) {
      return fn();
    },
  };
}

// ─── Test Helpers ───────────────────────────────────────────────────────────

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMockContext(overrides: {
  event?: Record<string, unknown>;
  step?: MockStepRun;
} = {}) {
  return {
    event: overrides.event ?? { data: {} },
    step: overrides.step ?? createMockStepRun(),
  };
}
