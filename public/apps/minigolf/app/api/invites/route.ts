import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { listPendingInvites } from "@/lib/queries";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const email = user.primaryEmailAddress?.emailAddress;
  const invites = email ? await listPendingInvites(email) : [];
  return NextResponse.json({ invites });
}
