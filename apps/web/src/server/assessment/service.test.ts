import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));
vi.mock("@/server/db", () => ({ query: queryMock, database: vi.fn() }));
vi.mock("@/server/classes/service", () => ({ assertClassAccess: vi.fn(), listClasses: vi.fn() }));
vi.mock("@/server/content/service", () => ({ listQuestionBank: vi.fn() }));

import { assignmentAvailability, listStudentAssignments, parseAssignmentSchedule, startOrResumeAttempt } from "./service";
import { AuthorizationError } from "@/server/auth/authorization";
import type { StudentSession } from "@/server/auth/session";

const session: StudentSession = {
  kind: "student", sessionId: "session-1", studentId: "student-1", schoolId: "school-1",
  enrollmentId: "enrollment-1", classId: "class-1", classCode: "X-A", className: "X A",
  loginId: "GL-001", fullName: "Alya", credentialVersion: 1,
};

describe("student assignment isolation and attempts", () => {
  beforeEach(() => queryMock.mockReset());

  it("scopes the shared assignment list to the student's class, student, and tenant", async () => {
    queryMock.mockResolvedValue([]);
    await listStudentAssignments(session);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("where a.class_id=$1 and a.school_id=$3"),
      ["class-1", "student-1", "school-1"],
    );
  });

  it("resumes the student's existing real attempt", async () => {
    queryMock
      .mockResolvedValueOnce([{ id: "assignment-1", school_id: "school-1", class_id: "class-1", quiz_version_id: "quiz-version-1", attempt_limit: 2, status: "ACTIVE", opens_at: null, closes_at: null }])
      .mockResolvedValueOnce([{ id: "attempt-1" }]);
    await expect(startOrResumeAttempt(session, "assignment-1")).resolves.toBe("attempt-1");
    expect(queryMock).toHaveBeenNthCalledWith(2, expect.stringContaining("status='IN_PROGRESS'"), ["assignment-1", "student-1"]);
    expect(queryMock).toHaveBeenCalledTimes(2);
  });

  it("rejects an assignment belonging to another tenant or class", async () => {
    queryMock.mockResolvedValueOnce([{ id: "assignment-1", school_id: "school-2", class_id: "class-1", quiz_version_id: "quiz-version-1", attempt_limit: 1, status: "ACTIVE", opens_at: null, closes_at: null }]);
    await expect(startOrResumeAttempt(session, "assignment-1")).rejects.toBeInstanceOf(AuthorizationError);
    expect(queryMock).toHaveBeenCalledTimes(1);
  });
});

describe("assignment schedules",()=>{
  it("allows an empty schedule",()=>{
    expect(parseAssignmentSchedule("","")).toEqual({opensAt:null,closesAt:null});
  });

  it("rejects a close instant equal to or earlier than open",()=>{
    expect(()=>parseAssignmentSchedule("2026-09-17T03:30:00.000Z","2026-09-17T03:30:00.000Z")).toThrow("Close must be after open");
    expect(()=>parseAssignmentSchedule("2026-09-17T03:30:00.000Z","2026-09-17T03:29:59.000Z")).toThrow("Close must be after open");
  });

  it("requires submitted schedule values to be absolute instants",()=>{
    expect(()=>parseAssignmentSchedule("2026-09-17T10:30","")).toThrow("must include a timezone");
  });

  it("preserves scheduled and open behavior at time boundaries",()=>{
    const now=new Date("2026-09-17T03:30:00.000Z");
    expect(assignmentAvailability({status:"ACTIVE",opensAt:new Date("2026-09-17T03:31:00.000Z"),closesAt:null},now)).toEqual({isScheduled:true,isExpired:false,isOpen:false});
    expect(assignmentAvailability({status:"ACTIVE",opensAt:now,closesAt:new Date("2026-09-17T04:00:00.000Z")},now)).toEqual({isScheduled:false,isExpired:false,isOpen:true});
    expect(assignmentAvailability({status:"ACTIVE",opensAt:null,closesAt:new Date("2026-09-17T03:29:59.000Z")},now)).toEqual({isScheduled:false,isExpired:true,isOpen:false});
  });
});
