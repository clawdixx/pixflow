import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  ASAAS_API_KEY: z.string().optional(),
  ASAAS_WEBHOOK_TOKEN: z.string().optional(),
  ASAAS_MOCK: z.enum(["true", "false"]).default("true").transform((v) => v === "true"),
  ZAPI_INSTANCE_ID: z.string().optional(),
  ZAPI_TOKEN: z.string().optional(),
  ZAPI_MOCK: z.enum(["true", "false"]).default("true").transform((v) => v === "true"),
  NEXT_PUBLIC_INNGEST_APP_ID: z.string().default("pixflow"),
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
