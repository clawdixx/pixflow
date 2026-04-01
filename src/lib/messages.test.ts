import { describe, it, expect } from "vitest";
import { d3Message, d7Message, d14Message, paymentConfirmedMessage } from "./messages";

describe("Templates de mensagens de follow-up", () => {
  const baseContext = {
    customerName: "Maria da Silva",
    amount: 850.0,
    dueDate: "2025-03-15",
    pixCopyCode: "00020126580014br.gov.bcb.pix0136abc123",
    paymentUrl: "https://asaas.com/c/pay_123",
  };

  describe("d3Message - Lembrete dia 3 (amigável)", () => {
    it("deve gerar mensagem amigável para cliente com dados pix", () => {
      const result = d3Message(baseContext);

      expect(result).toContain("Olá Maria da Silva!");
      expect(result).toContain("850,00");
      expect(result).toContain("💳 **Pagamento via Pix**");
      expect(result).toContain("00020126580014br.gov.bcb.pix0136abc123");
      expect(result).toContain("https://asaas.com/c/pay_123");
    });

    it("deve usar nome customizado do freelancer quando fornecido", () => {
      const result = d3Message({ ...baseContext, freelancerName: "Marcos" });

      expect(result).toContain("Marcos aqui");
    });

    it("deve omitir bloco pix quando não há dados", () => {
      const result = d3Message({
        customerName: "João",
        amount: 500,
        dueDate: "2025-04-01",
      });

      expect(result).toContain("Olá João!");
      expect(result).not.toContain("💳");
      expect(result).not.toContain("pixCopyCode");
    });
  });

  describe("d7Message - Lembrete dia 7 (mais direto)", () => {
    it("deve gerar mensagem mencionando 7 dias desde vencimento", () => {
      const result = d7Message(baseContext);

      expect(result).toContain("7 dias");
      expect(result).toContain("850,00");
    });

    it("deve incluir dados pix para pagamento", () => {
      const result = d7Message(baseContext);

      expect(result).toContain("💳 **Pagamento via Pix**");
      expect(result).toContain("00020126580014br.gov.bcb.pix0136abc123");
    });
  });

  describe("d14Message - Lembrete dia 14 (assertivo)", () => {
    it("deve gerar mensagem mencionando 14 dias e última chance", () => {
      const result = d14Message(baseContext);

      expect(result).toContain("14 dias");
      expect(result).toContain("850,00");
      expect(result).toContain("minha última mensagem automática");
    });

    it("deve solicitar comprovante após pagamento", () => {
      const result = d14Message(baseContext);

      expect(result).toContain("comprovante");
    });
  });

  describe("paymentConfirmedMessage - Confirmação de pagamento", () => {
    it("deve confirmar recebimento com valor correto", () => {
      const result = paymentConfirmedMessage(baseContext);

      expect(result).toContain("850,00");
      expect(result).toContain("✅");
      expect(result).toContain("Confirmamos o recebimento");
    });
  });

  describe("Formatação de moeda", () => {
    it("deve formatar valores em reais corretamente", () => {
      const msg = d3Message({
        customerName: "Teste",
        amount: 1234.56,
        dueDate: "2025-06-01",
      });

      expect(msg).toContain("1.234,56");
    });
  });

  describe("Formatação de data", () => {
    it("deve formatar datas em formato brasileiro", () => {
      const msg = d3Message({
        customerName: "Teste",
        amount: 100,
        dueDate: "2025-01-15",
      });

      // Verifica que contém data formatada (pode variar por fuso horário)
      expect(msg).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });
  });
});
