import { TeacherShell } from "@/components/app-shell";
import { getStaffPermissions } from "@/server/auth/permissions";
import { requireTeacherSession } from "@/server/auth/session";

export default async function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireTeacherSession();
  const permissions = await getStaffPermissions(session.staffUserId);
  const canManageAccounts =
    session.role === "SYSTEM_ADMIN" ||
    session.role === "SCHOOL_ADMIN" ||
    permissions.includes("ACCOUNT_MANAGE");

  return (
    <TeacherShell
      displayName={session.displayName}
      schoolName={session.schoolName}
      canManageAccounts={canManageAccounts}
    >
      {children}
    </TeacherShell>
  );
}
