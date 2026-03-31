import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Z-API Client - Envio de mensagens WhatsApp (modo mock)", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ZAPI_MOCK = "true";
  });

  it("deve retornar messageId mock quando ZAPI_MOCK=true", async () => {
    const { sendTextMessage } = await import("./zapi");

    const result = await sendTextMessage("5511999990001", "Olá Maria!");

    expect(result.messageId).toMatch(/^mock_zapi_/);
    expect(result.status).toBe("SENT");
  });

  it("deve aceitar telefone com código do país", async () => {
    const { sendTextMessage } = await import("./zapi");

    const result = await sendTextMessage("5511999990001", "Teste 1");

    expect(result.messageId).toBeDefined();
  });

  it("deve aceitar telefone sem código do país", async () => {
    const { sendTextMessage } = await import("./zapi");

    const result = await sendTextMessage("11999990001", "Teste 2");

    expect(result.messageId).toBeDefined();
  });

  it("deve enviar mensagem de imagem no modo mock", async () => {
    const { sendImageMessage } = await import("./zapi");

    const result = await sendImageMessage(
      "5511999990001",
      "https://exemplo.com/qrcode.png",
      "Pagamento Pix de R$ 850,00"
    );

    expect(result.messageId).toMatch(/^mock_zapi_/);
    expect(result.status).toBe("SENT");
  });
});
