import { fetchFromBackend } from "@/server/api/backend-client";

export async function getClassAccess(classId: string, userId: string, role = "MAHASISWA") {
  const res = await fetchFromBackend(`/classes/${classId}`, { userId, role });
  if (!res.ok) return null;
  const cls = await res.json();
  const isOwner = cls.dosenId === userId;
  const enrollment = cls.enrollments?.find(
    (e: { user?: { id: string }; userId?: string }) => (e.user?.id || e.userId) === userId,
  );
  if (!isOwner && !enrollment) return null;
  return { isOwner, isAssistant: enrollment?.role === "ASSISTANT" };
}
