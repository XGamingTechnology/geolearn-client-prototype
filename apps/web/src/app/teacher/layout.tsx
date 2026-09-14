import { TeacherShell } from "@/components/app-shell";
import { requireTeacherSession } from "@/server/auth/session";

export default async function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireTeacherSession();
  return <TeacherShell displayName={session.displayName} schoolName={session.schoolName}>{children}</TeacherShell>;
}
