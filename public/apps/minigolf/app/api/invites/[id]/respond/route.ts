import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { declineInvite, respondToInvite } from "@/lib/queries";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as { status: "accepted" | "declined" };

  if (body.status === "declined") {
    await declineInvite(id);
  } else {
    await respondToInvite(id, userId, "accepted");
  }
  return NextResponse.json({ ok: true });
}
