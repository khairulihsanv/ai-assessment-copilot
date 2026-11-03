import { redirect } from "next/navigation";

// The student "Study Copilot" chat was never implemented; keep old links working.
export default function CopilotPage() {
  redirect("/dashboard");
}
