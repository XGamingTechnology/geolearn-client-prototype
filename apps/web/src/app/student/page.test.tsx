import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireStudentSessionMock, listStudentAssignmentsMock } = vi.hoisted(() => ({
  requireStudentSessionMock: vi.fn(),
  listStudentAssignmentsMock: vi.fn(),
}));

vi.mock("@/server/auth/session", () => ({ requireStudentSession: requireStudentSessionMock }));
vi.mock("@/server/assessment/service", () => ({ listStudentAssignments: listStudentAssignmentsMock }));
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={String(href)} {...props}>{children}</a> }));

import StudentPage from "./page";

const session = {
  kind: "student" as const,
  sessionId: "session-1",
  studentId: "student-1",
  schoolId: "school-1",
  enrollmentId: "enrollment-1",
  classId: "class-1",
  classCode: "X-A",
  className: "X Geografi A",
  loginId: "GL-001",
  fullName: "Alya",
  credentialVersion: 1,
};

function assignment(overrides: Record<string, unknown> = {}) {
  return {
    id: "assignment-1", title: "Analisis Pola Permukiman", instructions: null,
    opensAt: null, closesAt: new Date("2027-01-20T08:00:00Z"), status: "ACTIVE",
    quizTitle: "Kuis Pola Spasial", itemCount: 4, attemptId: null, attemptStatus: null,
    scoreRaw: null, scoreMax: null, isOpen: true, isExpired: false, isScheduled: false,
    ...overrides,
  };
}

describe("Student Home assignments", () => {
  beforeEach(() => {
    requireStudentSessionMock.mockReset().mockResolvedValue(session);
    listStudentAssignmentsMock.mockReset();
  });

  it("shows an active database assignment and starts it through the real assignment endpoint", async () => {
    listStudentAssignmentsMock.mockResolvedValue([assignment()]);

    const html = renderToStaticMarkup(await StudentPage());

    expect(listStudentAssignmentsMock).toHaveBeenCalledWith(session);
    expect(html).toContain("Analisis Pola Permukiman");
    expect(html).toContain("Kuis Pola Spasial · 4 soal");
    expect(html).toContain('action="/api/assessment/assignments/assignment-1/start"');
    expect(html).not.toContain("/student/assessment/demo");
    expect(html).not.toContain("Pengaruh sungai terhadap akses sekolah");
  });

  it("represents in-progress and submitted attempts with the appropriate journey", async () => {
    listStudentAssignmentsMock.mockResolvedValue([assignment({ attemptId: "attempt-1", attemptStatus: "IN_PROGRESS" })]);
    const inProgressHtml = renderToStaticMarkup(await StudentPage());
    expect(inProgressHtml).toContain("Sedang dikerjakan");
    expect(inProgressHtml).toContain("Lanjutkan");

    listStudentAssignmentsMock.mockResolvedValue([assignment({ attemptId: "attempt-2", attemptStatus: "SUBMITTED" })]);
    const submittedHtml = renderToStaticMarkup(await StudentPage());
    expect(submittedHtml).toContain("Selesai");
    expect(submittedHtml).toContain('href="/student/result?attempt=attempt-2"');
    expect(submittedHtml).not.toContain("/start");
  });
});
