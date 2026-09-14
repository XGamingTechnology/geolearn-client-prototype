import { requireStudentSession } from "@/server/auth/session";

export default async function StudentLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireStudentSession();
  return children;
}
