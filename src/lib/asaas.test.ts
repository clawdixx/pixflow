import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Asaas Client - Integração com API de pagamentos (modo mock)", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ASAAS_MOCK = "true";
    process.env.ASAAS_API_KEY = "test_key";
  });

  it("deve retornar cliente mock por ID", async () => {
    const { getCustomer } = await import("./asaas");

    const customer = await getCustomer("cus_mock_001");

    expect(customer).not.toBeNull();
    expect(customer?.name).toBe("Maria da Silva");
    expect(customer?.email).toBe("maria@exemplo.com");
  });

  it("deve retornar null para cliente inexistente", async () => {
    const { getCustomer } = await import("./asaas");

    const customer = await getCustomer("cus_inexistente");

    expect(customer).toBeNull();
  });

  it("deve retornar pagamento mock com dados Pix", async () => {
    const { getPayment } = await import("./asaas");

    const payment = await getPayment("pay_mock_001");

    expect(payment).not.toBeNull();
    expect(payment?.id).toBe("pay_mock_001");
    expect(payment?.pixQrCode).toBeDefined();
    expect(payment?.pixCopyCode).toBeDefined();
  });

  it("deve criar pagamento mock e retornar dados", async () => {
    const { createPayment } = await import("./asaas");

    const payment = await createPayment({
      customerId: "cus_mock_001",
      value: 500.0,
      dueDate: "2025-06-01",
    });

    expect(payment.id).toMatch(/^pay_mock_/);
    expect(payment.customer).toBe("cus_mock_001");
    expect(payment.value).toBe(500.0);
    expect(payment.status).toBe("PENDING");
    expect(payment.pixQrCode).toBeDefined();
  });

  it("deve retornar true em modo mock para webhook signature", async () => {
    const { validateWebhookSignature } = await import("./asaas");

    const isValid = validateWebhookSignature('{"event":"PAYMENT_CREATED"}', "any_signature");

    expect(isValid).toBe(true);
  });
});
