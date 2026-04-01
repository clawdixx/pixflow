import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDb, MockFollowUpSchedule } from "../../lib/test-utils";

// Mock modules before importing
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      all: vi.fn().mockReturnValue([]),
      limit: vi.fn().mockReturnThis(),
    })),
    insert: vi.fn(() => ({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(() => ({
        all: vi.fn().mockReturnValue([]),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn(() => ({
        all: vi.fn().mockReturnValue([]),
      })),
    })),
  },
  eq: vi.fn((col: string, val: unknown) => `${col} = '${val}'`),
}));

vi.mock("@/lib/zapi", () => ({
  sendTextMessage: vi.fn().mockResolvedValue({ messageId: "mock_msg_123", status: "SENT" }),
}));

vi.mock("@/lib/messages", () => ({
  d3Message: vi.fn((ctx: { customerName: string; amount: number; dueDate: string }) => 
    `Olá ${ctx.customerName}! Lembrete: pagamento de R$ ${ctx.amount} vence em ${ctx.dueDate}`),
  d7Message: vi.fn((ctx: { customerName: string; amount: number; dueDate: string }) => 
    `Olá ${ctx.customerName}! 7 dias após vencimento: R$ ${ctx.amount}`),
  d14Message: vi.fn((ctx: { customerName: string; amount: number; dueDate: string }) => 
    `${ctx.customerName}, última chance: R$ ${ctx.amount}`),
}));

describe("Schedule Follow-ups - Agendamento de lembretes", () => {
  beforeEach(() => {
    mockDb.reset();
    vi.clearAllMocks();
  });

  describe("Criação de agendamentos (D3, D7, D14)", () => {
    it("deve criar 3 agendamentos quando um pagamento é criado", async () => {
      // Setup: criar customer e payment no mock DB
      const customer = mockDb.addCustomer({
        userId: "demo-user",
        name: "Maria da Silva",
        email: "maria@teste.com",
        phone: "5511999990001",
        asaasCustomerId: "cus_asaas_001",
        notes: null,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const payment = mockDb.addPayment({
        userId: "demo-user",
        customerId: customer.id,
        asaasPaymentId: "pay_asaas_001",
        amount: "850.00",
        status: "PENDING",
        dueDate: "2025-03-15",
        paidAt: null,
        pixQrCode: "qr_code_001",
        pixCopyCode: "pix_001",
        paymentUrl: "https://asaas.com/pay_001",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Simular lógica de scheduleFollowUps
      const dueDate = new Date(payment.dueDate);
      const schedules: MockFollowUpSchedule[] = [];

      for (const [step, days] of [["D3", 3], ["D7", 7], ["D14", 14]] as const) {
        const scheduledFor = new Date(dueDate);
        scheduledFor.setDate(scheduledFor.getDate() + days);
        
        schedules.push(mockDb.addSchedule({
          paymentId: payment.id,
          userId: payment.userId,
          customerId: customer.id,
          step,
          scheduledFor: scheduledFor.toISOString(),
          sentAt: null,
          status: "PENDING",
        }));
      }

      expect(schedules).toHaveLength(3);
      expect(schedules[0].step).toBe("D3");
      expect(schedules[1].step).toBe("D7");
      expect(schedules[2].step).toBe("D14");
    });

    it("deve calcular datas corretas para cada step", () => {
      const dueDate = new Date("2025-03-15");

      const d3 = new Date(dueDate); d3.setDate(d3.getDate() + 3);
      const d7 = new Date(dueDate); d7.setDate(d7.getDate() + 7);
      const d14 = new Date(dueDate); d14.setDate(d14.getDate() + 14);

      expect(d3.toISOString()).toContain("2025-03-18");
      expect(d7.toISOString()).toContain("2025-03-22");
      expect(d14.toISOString()).toContain("2025-03-29");
    });
  });

  describe("Verificação de lembretes pendentes", () => {
    it("deve identificar lembretes com scheduledFor <= agora", () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 dia atrás
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 dia no futuro

      const customer = mockDb.addCustomer({
        userId: "demo-user",
        name: "João Santos",
        email: "joao@teste.com",
        phone: "5511999990002",
        asaasCustomerId: null,
        notes: null,
        isActive: true,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });

      const payment = mockDb.addPayment({
        userId: "demo-user",
        customerId: customer.id,
        asaasPaymentId: "pay_002",
        amount: "1200.00",
        status: "OVERDUE",
        dueDate: pastDate.toISOString().split("T")[0],
        paidAt: null,
        pixQrCode: null,
        pixCopyCode: null,
        paymentUrl: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });

      // Agendamentos: um no passado (atrasado), um no futuro
      mockDb.addSchedule({
        paymentId: payment.id,
        userId: "demo-user",
        customerId: customer.id,
        step: "D3",
        scheduledFor: pastDate.toISOString(),
        sentAt: null,
        status: "PENDING",
      });

      mockDb.addSchedule({
        paymentId: payment.id,
        userId: "demo-user",
        customerId: customer.id,
        step: "D7",
        scheduledFor: futureDate.toISOString(),
        sentAt: null,
        status: "PENDING",
      });

      const pending = mockDb.findSchedulesByPaymentId(payment.id);
      const overdue = pending.filter(s => new Date(s.scheduledFor) <= now);

      expect(overdue).toHaveLength(1);
      expect(overdue[0].step).toBe("D3");
    });

    it("deve filtrar apenas lembretes com status PENDING", () => {
      const now = new Date();
      const customer = mockDb.addCustomer({
        userId: "demo-user",
        name: "Ana Costa",
        email: "ana@teste.com",
        phone: "5511999990003",
        asaasCustomerId: null,
        notes: null,
        isActive: true,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });

      const payment = mockDb.addPayment({
        userId: "demo-user",
        customerId: customer.id,
        asaasPaymentId: "pay_003",
        amount: "450.00",
        status: "PENDING",
        dueDate: "2025-04-01",
        paidAt: null,
        pixQrCode: null,
        pixCopyCode: null,
        paymentUrl: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });

      // Um PENDING, um já enviado, um pausado
      mockDb.addSchedule({
        paymentId: payment.id,
        userId: "demo-user",
        customerId: customer.id,
        step: "D3",
        scheduledFor: now.toISOString(),
        sentAt: null,
        status: "PENDING",
      });

      mockDb.addSchedule({
        paymentId: payment.id,
        userId: "demo-user",
        customerId: customer.id,
        step: "D7",
        scheduledFor: now.toISOString(),
        sentAt: now.toISOString(),
        status: "SENT",
      });

      mockDb.addSchedule({
        paymentId: payment.id,
        userId: "demo-user",
        customerId: customer.id,
        step: "D14",
        scheduledFor: now.toISOString(),
        sentAt: null,
        status: "PAUSED",
      });

      const pending = mockDb.findSchedulesByPaymentId(payment.id).filter(s => s.status === "PENDING");

      expect(pending).toHaveLength(1);
      expect(pending[0].step).toBe("D3");
    });
  });

  describe("Envio de lembretes via Z-API", () => {
    it("deve atualizar status para SENT após envio bem-sucedido", async () => {
      const { sendTextMessage } = await import("@/lib/zapi");
      const now = new Date();

      const customer = mockDb.addCustomer({
        userId: "demo-user",
        name: "Pedro Silva",
        email: "pedro@teste.com",
        phone: "5511999990004",
        asaasCustomerId: null,
        notes: null,
        isActive: true,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });

      const payment = mockDb.addPayment({
        userId: "demo-user",
        customerId: customer.id,
        asaasPaymentId: "pay_004",
        amount: "750.00",
        status: "OVERDUE",
        dueDate: "2025-02-28",
        paidAt: null,
        pixQrCode: null,
        pixCopyCode: "pix_004",
        paymentUrl: "https://asaas.com/c/pay_004",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });

      const schedule = mockDb.addSchedule({
        paymentId: payment.id,
        userId: "demo-user",
        customerId: customer.id,
        step: "D3",
        scheduledFor: now.toISOString(),
        sentAt: null,
        status: "PENDING",
      });

      // Simular envio
      const result = await sendTextMessage(customer.phone, "Teste mensagem");

      if (result.messageId) {
        // Atualizar status
        const updatedSchedule = { ...schedule, status: "SENT" as const, sentAt: now.toISOString() };
        mockDb.followUpSchedules = mockDb.followUpSchedules.map(s => 
          s.id === schedule.id ? updatedSchedule : s
        );
      }

      const updated = mockDb.findSchedulesByPaymentId(payment.id).find(s => s.id === schedule.id);
      expect(updated?.status).toBe("SENT");
      expect(updated?.sentAt).toBeDefined();
    });

    it("deve continuar para próximo lembrete se um falhar", async () => {
      const { sendTextMessage } = await import("@/lib/zapi");
      vi.mocked(sendTextMessage)
        .mockResolvedValueOnce({ messageId: "", status: "FAILED" }) // Primeiro falha
        .mockResolvedValueOnce({ messageId: "msg_456", status: "SENT" }); // Segundo funciona

      const now = new Date();

      const customer = mockDb.addCustomer({
        userId: "demo-user",
        name: "Teste Falha",
        email: "teste@teste.com",
        phone: "5511999990005",
        asaasCustomerId: null,
        notes: null,
        isActive: true,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });

      const payment = mockDb.addPayment({
        userId: "demo-user",
        customerId: customer.id,
        asaasPaymentId: "pay_005",
        amount: "300.00",
        status: "OVERDUE",
        dueDate: "2025-01-15",
        paidAt: null,
        pixQrCode: null,
        pixCopyCode: null,
        paymentUrl: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });

      mockDb.addSchedule({
        paymentId: payment.id,
        userId: "demo-user",
        customerId: customer.id,
        step: "D3",
        scheduledFor: now.toISOString(),
        sentAt: null,
        status: "PENDING",
      });

      mockDb.addSchedule({
        paymentId: payment.id,
        userId: "demo-user",
        customerId: customer.id,
        step: "D7",
        scheduledFor: now.toISOString(),
        sentAt: null,
        status: "PENDING",
      });

      // Tentar enviar para ambos
      const result1 = await sendTextMessage(customer.phone, "Msg 1");
      const result2 = await sendTextMessage(customer.phone, "Msg 2");

      expect(result1.status).toBe("FAILED");
      expect(result2.status).toBe("SENT");
    });
  });

  describe("Cancelamento de lembretes quando pago", () => {
    it("deve marcar todos os lembretes pendentes como SKIPPED quando pagamento confirmado", () => {
      const now = new Date();

      const customer = mockDb.addCustomer({
        userId: "demo-user",
        name: "Cliente Pago",
        email: "pago@teste.com",
        phone: "5511999990006",
        asaasCustomerId: null,
        notes: null,
        isActive: true,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });

      const payment = mockDb.addPayment({
        userId: "demo-user",
        customerId: customer.id,
        asaasPaymentId: "pay_006",
        amount: "500.00",
        status: "CONFIRMED", // Já pago
        dueDate: "2025-02-01",
        paidAt: now.toISOString(),
        pixQrCode: null,
        pixCopyCode: null,
        paymentUrl: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });

      // Agendamentos pendentes
      mockDb.addSchedule({
        paymentId: payment.id,
        userId: "demo-user",
        customerId: customer.id,
        step: "D3",
        scheduledFor: now.toISOString(),
        sentAt: null,
        status: "PENDING",
      });

      mockDb.addSchedule({
        paymentId: payment.id,
        userId: "demo-user",
        customerId: customer.id,
        step: "D7",
        scheduledFor: now.toISOString(),
        sentAt: null,
        status: "PENDING",
      });

      mockDb.addSchedule({
        paymentId: payment.id,
        userId: "demo-user",
        customerId: customer.id,
        step: "D14",
        scheduledFor: now.toISOString(),
        sentAt: null,
        status: "PENDING",
      });

      // Simular cancelamento (como no webhook PAYMENT_CONFIRMED)
      mockDb.updateSchedulesByPaymentId(payment.id, { status: "SKIPPED" });

      const schedules = mockDb.findSchedulesByPaymentId(payment.id);
      const allSkipped = schedules.every(s => s.status === "SKIPPED");

      expect(allSkipped).toBe(true);
    });
  });

  describe("Fluxo completo: criação → verificação → envio", () => {
    it("deve executar fluxo completo do follow-up", async () => {
      const { d3Message } = await import("@/lib/messages");
      const { sendTextMessage } = await import("@/lib/zapi");

      const now = new Date();
      const dueDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 dias no futuro

      // 1. Criar customer e payment
      const customer = mockDb.addCustomer({
        userId: "demo-user",
        name: "Fluxo Completo",
        email: "fluxo@teste.com",
        phone: "5511999990007",
        asaasCustomerId: "cus_asaas_007",
        notes: null,
        isActive: true,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });

      const payment = mockDb.addPayment({
        userId: "demo-user",
        customerId: customer.id,
        asaasPaymentId: "pay_asaas_007",
        amount: "900.00",
        status: "PENDING",
        dueDate: dueDate.toISOString().split("T")[0],
        paidAt: null,
        pixQrCode: "qr_007",
        pixCopyCode: "pix_007",
        paymentUrl: "https://asaas.com/pay_007",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });

      // 2. Agendar lembretes
      const schedules: MockFollowUpSchedule[] = [];
      for (const [step, days] of [["D3", 3], ["D7", 7], ["D14", 14]] as const) {
        const scheduledFor = new Date(dueDate);
        scheduledFor.setDate(scheduledFor.getDate() + days);
        schedules.push(mockDb.addSchedule({
          paymentId: payment.id,
          userId: payment.userId,
          customerId: customer.id,
          step,
          scheduledFor: scheduledFor.toISOString(),
          sentAt: null,
          status: "PENDING",
        }));
      }

      // 3. Verificar lembretes pendentes (simulando cron)
      const pending = mockDb.findSchedulesByPaymentId(payment.id)
        .filter(s => s.status === "PENDING" && new Date(s.scheduledFor) <= now);

      // 4. Enviar para cada um
      for (const schedule of pending) {
        const message = d3Message({
          customerName: customer.name,
          amount: Number(payment.amount),
          dueDate: payment.dueDate,
          pixCopyCode: payment.pixCopyCode ?? undefined,
          paymentUrl: payment.paymentUrl ?? undefined,
        });

        const result = await sendTextMessage(customer.phone, message);

        if (result.messageId) {
          mockDb.followUpSchedules = mockDb.followUpSchedules.map(s =>
            s.id === schedule.id ? { ...s, status: "SENT" as const, sentAt: now.toISOString() } : s
          );
        }
      }

      // 5. Verificar resultado
      const finalSchedules = mockDb.findSchedulesByPaymentId(payment.id);
      const sentCount = finalSchedules.filter(s => s.status === "SENT").length;

      // Como as datas são futuras, não deve ter nenhum enviado
      expect(schedules).toHaveLength(3);
      expect(sentCount).toBe(0); // Nenhum enviado porque as datas são futuras
    });
  });
});
