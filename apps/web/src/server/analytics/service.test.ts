import { beforeEach, describe, expect, it, vi } from "vitest";

const {queryMock,listClassesMock}=vi.hoisted(()=>({
  queryMock:vi.fn(),
  listClassesMock:vi.fn(),
}));

vi.mock("@/server/db",()=>({query:queryMock}));
vi.mock("@/server/classes/service",()=>({listClasses:listClassesMock}));

import { getStudentSkillProfiles, recomputeSpatialSkillScores, spatialModes } from "./service";
import type { TeacherSession } from "@/server/auth/session";

function session():TeacherSession{
  return {
    kind:"teacher",
    sessionId:"session",
    staffUserId:"teacher-1",
    schoolId:"school-1",
    email:"teacher@example.com",
    role:"TEACHER",
    displayName:"Teacher",
    schoolName:"School",
    credentialVersion:1,
  };
}

describe("Spatial Thinking analytics authorization",()=>{
  beforeEach(()=>{
    queryMock.mockReset();
    listClassesMock.mockReset();
  });

  it("keeps the locked eight spatial modes",()=>{
    expect(spatialModes).toEqual([
      "location","condition","influence","region","hierarchy","analogy","pattern","association",
    ]);
  });

  it("does not touch analytics cache when teacher has no authorized classes",async()=>{
    listClassesMock.mockResolvedValue([]);
    await expect(recomputeSpatialSkillScores(session())).resolves.toBe(0);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("scopes cache deletion and recomputation to authorized class ids",async()=>{
    listClassesMock.mockResolvedValue([{id:"class-a"},{id:"class-b"}]);
    queryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{count:4}]);

    await expect(recomputeSpatialSkillScores(session())).resolves.toBe(4);

    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("e.class_id=any($2::uuid[])"),
      ["school-1",["class-a","class-b"]],
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("a.class_id=any($2::uuid[])"),
      ["school-1",["class-a","class-b"]],
    );
  });

  it("filters student profiles through authorized enrollments",async()=>{
    listClassesMock.mockResolvedValue([{id:"class-a"}]);
    queryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{count:0}])
      .mockResolvedValueOnce([
        {studentId:"student-1",studentName:"Alya",studentSortName:"alya",loginId:"GL-001",mode:"location",score:80,answeredCount:5,correctCount:4},
      ]);

    const profiles=await getStudentSkillProfiles(session());

    expect(profiles[0]?.studentName).toBe("Alya");
    expect(queryMock).toHaveBeenLastCalledWith(
      expect.stringContaining("e.class_id=any($2::uuid[])"),
      ["school-1",["class-a"]],
    );
    expect(queryMock.mock.calls.at(-1)?.[0]).toContain('lower(s.full_name) as "studentSortName"');
    expect(queryMock.mock.calls.at(-1)?.[0]).toContain('order by "studentSortName",mode');
  });
});
