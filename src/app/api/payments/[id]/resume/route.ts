import { NextRequest, NextResponse } from "next/server";
import { db, eq } from "@/lib/db";

// POST /api/payments/[id]/resume
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const paymentId = parseInt(id);
  const now = new Date().toISOString();

  db.update("pixflow_follow_up_schedules")
    .set({ status: "PENDING", scheduled_for: now })
    .where(eq("payment_id", paymentId), paymentId)
    .returning();

  console.log(`[Pixflow] Lembretes retomados para payment ${paymentId}`);
  return NextResponse.json({ ok: true });
}
