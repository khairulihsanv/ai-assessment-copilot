import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { authConfig } from "./auth.config";

const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET || "supersecretdevkey1234567890abcdef",
  trustHost: true, // Required for Vercel deployment
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) return null;

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
});
