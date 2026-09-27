import {beforeEach,describe,expect,it,vi} from "vitest";

const {queryMock}=vi.hoisted(()=>({queryMock:vi.fn()}));
vi.mock("@/server/db",()=>({query:queryMock,database:vi.fn()}));
vi.mock("@/server/auth/permissions",()=>({canManageSchoolContent:vi.fn(),hasStaffPermission:vi.fn()}));

import {publishQuestionDraft} from "./service";
import type {TeacherSession} from "@/server/auth/session";

const actor:TeacherSession={kind:"teacher",sessionId:"session",staffUserId:"teacher-1",schoolId:"school-1",email:"guru@example.test",role:"TEACHER",displayName:"Guru",schoolName:"Sekolah",credentialVersion:1};
const question={id:"question-1",school_id:"school-1",owner_teacher_id:"teacher-1",scope:"PRIVATE"};
const answers=[{id:"A",label:"Ya"},{id:"B",label:"Tidak"}];

function draft(activityConfig:Record<string,unknown>){
  return {id:"draft-1",stimulusType:"webgis",responseConfig:{type:"multiple-choice",answers},validationConfig:{correctAnswer:"A"},activityConfig};
}

// Release guard: publication must validate the complete persisted WebGIS contract.
describe("QuestionVersion publication regression gate",()=>{
  beforeEach(()=>queryMock.mockReset());

  it("rejects a slider draft without an exact TARGET binding",async()=>{
    queryMock
      .mockResolvedValueOnce([question])
      .mockResolvedValueOnce([draft({mapExperience:"slider",tools:[],requiredActions:[]})])
      .mockResolvedValueOnce([{role:"SOURCE"}])
      .mockResolvedValueOnce([]);

    await expect(publishQuestionDraft(actor,"question-1")).rejects.toThrow("Map Slider memerlukan tepat satu TARGET Dataset.");
    expect(queryMock.mock.calls.some(([sql])=>String(sql).startsWith("update question_versions"))).toBe(false);
  });

  it("validates every configured GIS tool instead of only the first required action",async()=>{
    queryMock
      .mockResolvedValueOnce([question])
      .mockResolvedValueOnce([draft({mapExperience:"analysis",tools:["buffer","overlay","distance"],requiredActions:[{tool:"buffer",parameters:{distanceMeters:500}}],toolParameters:{buffer:{distanceMeters:500}}})])
      .mockResolvedValueOnce([{role:"SOURCE"}])
      .mockResolvedValueOnce([]);

    await expect(publishQuestionDraft(actor,"question-1")).rejects.toThrow("Overlay/Distance memerlukan satu TARGET Dataset.");
    expect(queryMock.mock.calls.some(([sql])=>String(sql).startsWith("update question_versions"))).toBe(false);
  });

  it("publishes a complete SOURCE/TARGET/CONTEXT slider snapshot",async()=>{
    queryMock
      .mockResolvedValueOnce([question])
      .mockResolvedValueOnce([draft({mapExperience:"slider",tools:["buffer","overlay","distance"],requiredActions:[{tool:"buffer",parameters:{distanceMeters:500}},{tool:"overlay"}],toolParameters:{buffer:{distanceMeters:500}}})])
      .mockResolvedValueOnce([{role:"SOURCE"},{role:"TARGET"},{role:"CONTEXT"}])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(publishQuestionDraft(actor,"question-1")).resolves.toBeUndefined();
    expect(queryMock).toHaveBeenLastCalledWith("update question_versions set status='PUBLISHED',published_at=now() where id=$1",["draft-1"]);
  });
});
