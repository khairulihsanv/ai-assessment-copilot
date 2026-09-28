"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { signIn } from "@/lib/auth/auth";
import { registerSchema, loginSchema } from "@/lib/validators/auth";
import { AuthError } from "next-auth";

interface ActionResult {
  success: boolean;
  error?: string;
}

export async function registerAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
    role: formData.get("role") as "DOSEN" | "MAHASISWA",
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid",
    };
  }

  const { name, email, password, role } = parsed.data;

  try {
    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return {
        success: false,
        error: "Email sudah terdaftar. Silakan gunakan email lain atau login.",
      };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
      },
    });
  } catch (error) {
    console.error("Register action error:", error);
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("connect") || msg.includes("PrismaClientInitializationError") || msg.includes("database")) {
      return {
        success: false,
        error: "Koneksi database gagal. Pastikan DATABASE_URL PostgreSQL sudah dikonfigurasi dengan benar.",
      };
    }
    return {
      success: false,
      error: "Gagal memproses pendaftaran. Periksa koneksi database Anda.",
    };
  }

  // signIn MUST be called outside try/catch so NEXT_REDIRECT propagates correctly.
  // Next-Auth v5 throws a NEXT_REDIRECT on successful signIn, which Next.js
  // needs to catch to perform the redirect. If we wrap it in try/catch, the
  // redirect gets swallowed and login appears to hang.
  await signIn("credentials", {
    email,
    password,
    redirectTo: "/dashboard",
  });

  // Technically unreachable because signIn throws a redirect, but required by TypeScript
  return { success: true };
}

export async function loginAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid",
    };
  }

  try {
    // signIn MUST be called so that NEXT_REDIRECT can propagate.
    // We only catch AuthError (wrong credentials), and re-throw everything else
    // (including NEXT_REDIRECT which Next.js needs for navigation).
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: "Email atau password salah." };
    }
    // Re-throw everything else — this includes NEXT_REDIRECT (successful login)
    // and any other unexpected errors. Next.js will handle the redirect.
    throw error;
  }

  // Technically unreachable — signIn either redirects or throws
  return { success: true };
}
