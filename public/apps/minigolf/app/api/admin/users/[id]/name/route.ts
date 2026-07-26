import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserById, isAdmin, updateUserName } from "@/lib/queries";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { name } = (await req.json()) as { name?: string };
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const target = await getUserById(id);
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!target.is_guest) {
    return NextResponse.json(
      { error: "Only guest users can be renamed here" },
      { status: 400 }
    );
  }

  await updateUserName(id, name.trim());
  return NextResponse.json({ ok: true });
}
