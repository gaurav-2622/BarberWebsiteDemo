"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/auth";
import { consumeRateLimit, publicRateLimits } from "@/lib/security/rate-limit";

export async function loginAction(formData: FormData) {
  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip")?.trim() ||
    "unknown";
  const limit = consumeRateLimit(`login:${ip}`, publicRateLimits.login);

  if (!limit.ok) {
    redirect("/admin/login?error=rate-limited");
  }

  const email = formData.get("email");
  const password = formData.get("password");

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/admin",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/admin/login?error=invalid-credentials");
    }

    throw error;
  }
}

export async function logoutAction() {
  await signOut({
    redirectTo: "/admin/login",
  });
}
