import { redirect } from "next/navigation";
import type { ClassPayload, EnrollmentPayload } from "@/components/features/assignments-view";
import { StudyChat } from "@/components/features/study-chat";
import { fetchFromBackend } from "@/server/api/backend-client";
import { auth } from "@/server/auth/auth";
export const metadata = { title: "Study Copilot — Dexa Assessment" };
export default async function CopilotPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { data } = await fetchFromBackend<{
    classes?: ClassPayload[];
    enrollments?: EnrollmentPayload[];
  }>("/assignments-overview");
  const classes = data?.classes || data?.enrollments?.map((e) => e.class) || [];
  const tasks = classes.flatMap((c) =>
    (c.assignments || []).map((a) => ({ id: a.id, title: a.title, className: c.name })),
  );
  return <StudyChat tasks={tasks} name={session.user.name || "teman belajar"} />;
}
