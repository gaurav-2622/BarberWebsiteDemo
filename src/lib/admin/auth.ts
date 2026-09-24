import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { UserRole } from "@/generated/prisma/client";

export async function requireOwner() {
  const session = await auth();

  if (!session?.user || session.user.role !== UserRole.OWNER) {
    redirect("/admin/login");
  }

  return session;
}
