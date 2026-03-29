import { NextRequest, NextResponse } from "next/server";
import { db, eq } from "@/lib/db";

// POST /api/payments/[id]/pause
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const paymentId = parseInt(id);

  db.update("pixflow_follow_up_schedules")
    .set({ status: "PAUSED" })
    .where(eq("payment_id", paymentId), paymentId)
    .returning();

  console.log(`[Pixflow] Lembretes pausados para payment ${paymentId}`);
  return NextResponse.json({ ok: true, message: "Lembretes pausados com sucesso." });
}
