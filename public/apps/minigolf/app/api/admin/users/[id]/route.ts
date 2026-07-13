import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { deleteUser, isAdmin } from "@/lib/queries";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (id === userId) {
    return NextResponse.json({ error: "You can't delete your own account" }, { status: 400 });
  }

  const result = await deleteUser(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
