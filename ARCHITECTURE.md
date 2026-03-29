# Pixflow — Arquitetura MVP

## Visão Geral

Pixflow é uma ferramenta de automação de follow-up de pagamentos via WhatsApp para freelancers brasileiros. O sistema conecta-se ao Asaas (webhooks), agenda lembretes nos dias 3/7/14 após vencimento, e envia mensagens via Z-API WhatsApp.

## Stack

- **Framework**: Next.js 16 (App Router, TypeScript, Tailwind CSS v4)
- **ORM**: Drizzle ORM + Neon PostgreSQL (HTTP driver via `@neondatabase/serverless`)
- **Background Jobs**: Inngest (funções serverless para agendamento)
- **WhatsApp**: Z-API (Business Solution Partner Brasil)
- **Cobrança**: Asaas API (webhooks para eventos de pagamento)
- **UI**: shadcn/ui components + neon design tokens (mesma convenção Faro)
- **i18n**: pt-BR apenas

## Arquitetura de Domínio

```
src/modules/
  customers/     — Cadastro de clientes do freelancer (devedores)
  payments/      — Pagamentos Asaas vinculados a customers
  follow-ups/    — Sequência de lembretes (3/7/14 dias)
  inngest/       — Funções de background (scheduling, envio)
```

## Modelo de Dados

### `users` (freelancer = tenant)
```
id, name, email, phone, asaas_api_key, zapi_instance_id, zapi_token, created_at
```

### `customers` (cliente do freelancer = devedor)
```
id, user_id (tenant), name, email, phone (WhatsApp),asaas_customer_id, notes, is_active, created_at
```

### `payments`
```
id, user_id, customer_id, asaas_payment_id, amount, status
  (PENDING | OVERDUE | CONFIRMED | CANCELLED),
  due_date, paid_at, pix_qr_code, pix_copy_code, created_at
```

### `follow_up_schedules`
```
id, payment_id, user_id, step (D3|D7|D14),
  scheduled_for, sent_at, status (PENDING|SENT|SKIPPED|PAUSED),
  created_at
```

### `follow_up_messages`
```
id, follow_up_schedule_id, customer_id, payment_id,
  message_type (D3|D7|D14|MANUAL), content, sent_at, zapi_message_id,
  zapi_status (QUEUED|SENT|DELIVERED|READ|FAILED), created_at
```

## State Machine do Pagamento

```
PENDING → OVERDUE → [d3: SCHEDULED → SENT → OVERDUE]
                  → [d7: SCHEDULED → SENT → OVERDUE]
                  → [d14: SCHEDULED → SENT → PAID | LOST]
                  → PAID (webhook Asaas intercepta)
                  → CANCELLED (webhook Asaas intercepta)
```

## Fluxo Principal

### 1. Webhook Asaas (pagamento criado)
```
POST /api/webhooks/asaas
  → Valida assinatura Asaas
  → Busca/ cria customer pelo asaas_customer_id
  → Cria payment record
  → ScheduleFollowUps() → cria 3 follow_up_schedules (D3, D7, D14)
```

### 2. Agendamento (Inngest)
```
checkAndSendReminders (executa a cada 5 min ou daily cron)
  → SELECT * FROM follow_up_schedules
     WHERE status = 'PENDING'
     AND scheduled_for <= NOW()
  → Para cada schedule:
     → buildMessage(customer, payment)
     → Z-API POST /messages
     → UPDATE follow_up_schedule SET status = 'SENT', sent_at = NOW()
     → INSERT follow_up_messages
```

### 3. Webhook Asaas (pagamento confirmado)
```
→ UPDATE payments SET status = 'CONFIRMED', paid_at = NOW()
→ UPDATE follow_up_schedules SET status = 'SKIPPED'
  WHERE payment_id = ? AND status = 'PENDING'
```

## API Routes

| Route | Método | Descrição |
|-------|--------|-----------|
| `/api/webhooks/asaas` | POST | Webhook Asaas (payment.created, payment.confirmed, payment.overdue) |
| `/api/inngest` | POST | Inngest serve endpoint |
| `/api/customers` | GET, POST | Listar/criar clientes |
| `/api/customers/[id]` | GET, PATCH, DELETE | Detalhe/atualizar/cliente |
| `/api/payments/[id]/pause` | POST | Pausar todos os lembretes de um pagamento |
| `/api/payments/[id]/resume` | POST | Retomar lembretes |
| `/api/payments/[id]/skip-step` | POST | Pular um step específico |

## Z-API Integration

```typescript
// src/lib/zapi.ts
const ZAPI_BASE = 'https://api.z-api.io/v2'
// Instance management, message sending, delivery receipts
```

### Formato de Mensagem

**D3 (Dia 3):**
```
Olá {customer_name}! 👋

Tudo bem? Passando aqui pra lembrar que o pagamento de R$ {amount}
venceu há 3 dias.

A quitação pode ser feita via Pix:
{include pix_qr_code_image if available}
Ou pelo link: {asaas_payment_url}

Qualquer dúvida, me responde aqui! 🙌
```

**D7 (Dia 7):**
```
Oi {customer_name}! 

Já se passaram 7 dias do vencimento do pagamento de R$ {amount}.

Entendo que às vezes escapa, mas preciso te dar um lembrate gentil 😊

Pix: {qr_code}
Ou: {payment_url}

Se já pagou, pode desconsiderar! Me envia o comprovante aqui.
```

**D14 (Dia 14):**
```
{includes similar message}
```

## Mock Integration (MVP sem credenciais)

Para demonstração local, todas as integrações Asaas e Z-API têm modos mock:
- `ASAAS_MOCK=true` → webhook simula criação de pagamento
- `ZAPI_MOCK=true` → Z-API POST retorna sucesso sem realmente enviar

## Segurança

- Webhook Asaas: validação de assinatura HMAC-SHA256
- Z-API: Bearer token authentication
- Tenant isolation: todas queries incluem `WHERE user_id = ?`
- Rate limiting: Upstash Redis para Z-API (evitar bloqueios)

## Ambiente Local

```bash
npm install
cp .env.local.example .env.local
# preencher ASAAS_WEBHOOK_TOKEN, ZAPI_TOKEN, etc (ou usar MOCK=true)
npm run dev
npx inngest-cli dev  # para desenvolvimento Inngest
```

## Decisões de Design

1. **Scheduling via Inngest** — não node-cron. Same stack as Faro, serverless-native, retry automático.
2. **State machine em DB** — status de cada step no banco (não em memória). Permite pause/resume mesmo após restart.
3. **QR code como texto** — Não geramos imagem. Enviamos o código Pix como texto (mais simples, funciona em todos os celulares).
4. **Sem auth própria no MVP** — Clerk (mesmo padrão Faro) para autenticacao.
5. **pt-BR only** — Sem i18n. Tudo em português brasileiro.
