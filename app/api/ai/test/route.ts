import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { chatWithAI, GradingError } from "@/lib/ai/grading-client";

// POST /api/ai/test — Test AI provider connectivity
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DOSEN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const message = body.message || "Test AI Assessment Copilot";

    const result = await chatWithAI(message);

    return NextResponse.json({
      success: true,
      provider: result.provider,
      model: result.model,
      message: result.message,
    });
  } catch (error) {
    console.error("[AI Test] Error:", error instanceof Error ? error.message : error);

    if (error instanceof GradingError) {
      return NextResponse.json(
        {
          success: false,
          error: "AI provider request failed",
          provider: "groq",
          message: error.message,
          code: error.code,
        },
        { status: error.code === "CONFIG_ERROR" ? 500 : 502 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "AI provider request failed",
        provider: "groq",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
