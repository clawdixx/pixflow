/**
 * Z-API (WhatsApp Business) client
 * Docs: https://docs.z-api.io/
 *
 * Modo mock: quando ZAPI_MOCK=true, simula envio sem realmente
 * conectar à API Z-API.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ZApiSendResult {
  messageId: string;
  status: "SENT" | "DELIVERED" | "READ" | "FAILED";
}

export interface ZApiDeliveryReceipt {
  messageId: string;
  status: "SENT" | "DELIVERED" | "READ" | "FAILED";
  timestamp: number;
}

// ─── Mock ID generator ───────────────────────────────────────────────────────

let mockMessageCounter = 1000;
function mockMessageId(): string {
  return `mock_zapi_${Date.now()}_${mockMessageCounter++}`;
}

// ─── Client ──────────────────────────────────────────────────────────────────

const ZAPI_BASE_URL = "https://api.z-api.io";
const IS_MOCK = process.env.ZAPI_MOCK === "true";

function getInstanceUrl(): string {
  const instanceId = process.env.ZAPI_INSTANCE_ID!;
  const token = process.env.ZAPI_TOKEN!;
  return `${ZAPI_BASE_URL}/instances/${instanceId}/token/${token}`;
}

function getHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
}

/**
 * Envia mensagem de texto via WhatsApp para um número.
 * Número deve estar no formato: DDD+número (ex: 5511999990001)
 */
export async function sendTextMessage(
  phone: string,
  content: string
): Promise<ZApiSendResult> {
  if (IS_MOCK) {
    console.log(`[ZAPI MOCK] Enviando para ${phone}:\n${content}\n`);
    return {
      messageId: mockMessageId(),
      status: "SENT",
    };
  }

  const url = `${getInstanceUrl()}/send-text`;
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      phone: normalizePhone(phone),
      message: content,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[ZAPI] Erro ao enviar mensagem: ${err}`);
    return { messageId: "", status: "FAILED" };
  }

  const data = await res.json();
  return {
    messageId: data.messageId ?? data.id ?? "",
    status: "SENT",
  };
}

/**
 * Envia mensagem com imagem (QR Code Pix) via WhatsApp.
 */
export async function sendImageMessage(
  phone: string,
  imageUrl: string,
  caption: string
): Promise<ZApiSendResult> {
  if (IS_MOCK) {
    console.log(`[ZAPI MOCK] Enviando imagem para ${phone}:\n${caption}\n`);
    return { messageId: mockMessageId(), status: "SENT" };
  }

  const url = `${getInstanceUrl()}/send-image`;
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      phone: normalizePhone(phone),
      image: imageUrl,
      caption,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[ZAPI] Erro ao enviar imagem: ${err}`);
    return { messageId: "", status: "FAILED" };
  }

  const data = await res.json();
  return {
    messageId: data.messageId ?? data.id ?? "",
    status: "SENT",
  };
}

/** Normaliza número: remove espaços, traços, adiciona código do país se necessário */
function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  // Se não começa com 55 (código Brasil), adiciona
  if (!cleaned.startsWith("55")) {
    cleaned = "55" + cleaned;
  }
  return cleaned;
}
