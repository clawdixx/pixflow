/**
 * Templates de mensagens de follow-up (pt-BR)
 * Seguem o fluxo: D3 → D7 → D14 com tom progressivamente mais assertivo
 */

export interface MessageContext {
  customerName: string;
  amount: number;
  dueDate: string;
  pixCopyCode?: string;
  paymentUrl?: string;
  freelancerName?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function pixBlock(ctx: MessageContext): string {
  const lines: string[] = [];
  if (ctx.pixCopyCode) {
    lines.push(`💳 **Pagamento via Pix**`);
    lines.push(`Código Pix (copia e cola):`);
    lines.push(`\`${ctx.pixCopyCode}\``);
    lines.push("");
  }
  if (ctx.paymentUrl) {
    lines.push(`🔗 Ou pague pelo link: ${ctx.paymentUrl}`);
    lines.push("");
  }
  return lines.join("\n");
}

/** Dia 3 — Lembrete gentil e amigável */
export function d3Message(ctx: MessageContext): string {
  const freelancer = ctx.freelancerName ? `${ctx.freelancerName} aqui` : "Oi";
  return `Olá ${ctx.customerName}! 👋

${freelancer}, tudo bem?

Venho aqui só pra lembrar que o pagamento de **${formatCurrency(ctx.amount)}**
venceu no dia ${formatDate(ctx.dueDate)}.

Se já quitou, pode desconsiderar! Mas se ainda não teve chance, ficaeasy fazer pelo Pix:

${pixBlock(ctx)}

Qualquer dúvida, me responde aqui! 😊`;
}

/** Dia 7 — Tom mais direto, menciona Consequences */
export function d7Message(ctx: MessageContext): string {
  return `Oi ${ctx.customerName}, tudo bem?

Já se passaram **7 dias** desde o vencimento do pagamento de **${formatCurrency(ctx.amount)}**
(que venceu em ${formatDate(ctx.dueDate)}).

Entendo que às vezes escapa, mas preciso te dar um lembrete gentil 😊

Estou disponibilizando novamente os dados para quitação:

${pixBlock(ctx)}

Se já pagou, me envia o comprovante aqui que jáFecho o assunto!

Abraço,`;
}

/** Dia 14 — Última chance, tom sério mas educado */
export function d14Message(ctx: MessageContext): string {
  return `${ctx.customerName},

Já se passaram **14 dias** do vencimento da sua obrigação de **${formatCurrency(ctx.amount)}**
(venceu em ${formatDate(ctx.dueDate)}).

Essa é minha última mensagem automática sobre o assunto.

Dados para pagamento:

${pixBlock(ctx)}

Após o pagamento, por favor me envie o comprovante para eu confirmar.

Caso haja qualquer dificuldade ou dúvida, entre em contato o quanto antes.

Atenciosamente,`;
}

/** Mensagem de pagamento confirmado (opcional, enviado após webhook) */
export function paymentConfirmedMessage(ctx: MessageContext): string {
  return `Olá ${ctx.customerName}! ✅

Confirmamos o recebimento do pagamento de **${formatCurrency(ctx.amount)}**.

Muito obrigado! Qualquer coisa, estou à disposição.

Att,`;
}
