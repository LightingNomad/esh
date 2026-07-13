import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isAdmin, setUserRole } from "@/lib/queries";

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
  const { role } = (await req.json()) as { role: "user" | "admin" };
  if (role !== "user" && role !== "admin") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (id === userId) {
    return NextResponse.json({ error: "You can't change your own role" }, { status: 400 });
  }

  await setUserRole(id, role);
  return NextResponse.json({ ok: true });
}
