import { redirect } from "next/navigation";
import { GradingList, type GradingRow } from "@/components/features/grading-list";
import { fetchFromBackend } from "@/server/api/backend-client";
import { auth } from "@/server/auth/auth";

export const metadata = { title: "Koreksi | Dexa Assessment" };

export default async function GradingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "DOSEN") redirect("/dashboard");

  const { data } = await fetchFromBackend<GradingRow[]>("/grading-hub");

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[26px] leading-tight lg:text-[32px]">Koreksi</h1>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          Periksa jawaban dan draf AI. Rilis nilai setelah Anda yakin.
        </p>
      </header>
      <GradingList rows={data ?? []} />
    </div>
  );
}
