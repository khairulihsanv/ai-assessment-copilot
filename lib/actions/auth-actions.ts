"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { signIn } from "@/lib/auth/auth";
import { registerSchema, loginSchema } from "@/lib/validators/auth";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

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

    // Auto sign in after registration
    // signIn will throw a NEXT_REDIRECT on success — we must let it propagate
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });

    // This line is technically unreachable because signIn redirects on success
    return { success: true };
  } catch (error) {
    // CRITICAL: Next-Auth v5 signIn() throws a NEXT_REDIRECT error on success.
    // We MUST re-throw it so Next.js can handle the redirect properly.
    if (isRedirectError(error)) {
      throw error;
    }

    console.error("Register action error:", error);
    if (error instanceof AuthError) {
      return { success: false, error: "Registrasi berhasil, silakan coba login." };
    }
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
    // signIn will throw a NEXT_REDIRECT on success — we must let it propagate
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });

    // This line is technically unreachable because signIn redirects on success
    return { success: true };
  } catch (error) {
    // CRITICAL: Next-Auth v5 signIn() throws a NEXT_REDIRECT error on success.
    // We MUST re-throw it so Next.js can handle the redirect properly.
    if (isRedirectError(error)) {
      throw error;
    }

    console.error("Login action error:", error);
    if (error instanceof AuthError) {
      return { success: false, error: "Email atau password salah." };
    }
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("connect") || msg.includes("PrismaClientInitializationError") || msg.includes("database") || msg.includes("ECONNREFUSED")) {
      return {
        success: false,
        error: "Tidak dapat terhubung ke database. Pastikan DATABASE_URL PostgreSQL aktif.",
      };
    }
    return {
      success: false,
      error: "Terjadi kesalahan saat masuk. Pastikan database PostgreSQL aktif.",
    };
  }
}
