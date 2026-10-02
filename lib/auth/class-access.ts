import { prisma } from "@/lib/db/prisma";

export async function getClassAccess(classId: string, userId: string) {
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { dosenId: true, enrollments: { where: { userId }, select: { role: true } } },
  });
  if (!cls) return null;
  const isOwner = cls.dosenId === userId;
  const enrollment = cls.enrollments[0];
  if (!isOwner && !enrollment) return null;
  return { isOwner, isAssistant: enrollment?.role === "ASSISTANT" };
}
