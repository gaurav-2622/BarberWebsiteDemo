import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  pages: {
    signIn: "/admin/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const pathname = request.nextUrl.pathname;
      const isAdminRoute = pathname.startsWith("/admin");
      const isLoginRoute = pathname.startsWith("/admin/login");

      if (!isLoginRoute && isAdminRoute) {
        return auth?.user?.role === "OWNER";
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role === "OWNER" ? "OWNER" : "CUSTOMER";
      }

      return session;
    },
  },
} satisfies NextAuthConfig;
