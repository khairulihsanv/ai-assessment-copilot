"use server";

import { registerSchema } from "@dexa/contracts";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

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
    const res = await fetch(`${BACKEND_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email: email.trim().toLowerCase(),
        password,
        role: role || "MAHASISWA",
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        error: data.detail || "Email sudah terdaftar atau data pendaftaran tidak sah.",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Register action error:", error);
    return {
      success: false,
      error: "Gagal memproses pendaftaran. Periksa koneksi backend Anda.",
    };
  }
}

export async function loginAction(formData: FormData): Promise<ActionResult> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, error: "Email dan kata sandi wajib diisi" };
  }

  try {
    const res = await fetch(`${BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        error: data.detail || "Email atau kata sandi tidak cocok.",
      };
    }

    const { access_token } = data;
    const cookieStore = await cookies();
    cookieStore.set("dexa_session", access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 12 * 60 * 60,
    });

    return { success: true };
  } catch (error) {
    console.error("Login action error:", error);
    return {
      success: false,
      error: "Gagal menghubungi server autentikasi backend.",
    };
  }
}
