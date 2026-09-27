import {describe,expect,it,vi} from "vitest";

vi.mock("server-only",()=>({}));
const {createQuestionDraftMock,createQuestionGroupMock,attachQuestionToGroupMock}=vi.hoisted(()=>({createQuestionDraftMock:vi.fn(),createQuestionGroupMock:vi.fn(),attachQuestionToGroupMock:vi.fn()}));
vi.mock("./service",()=>({createQuestionDraft:createQuestionDraftMock}));
vi.mock("./question-groups",()=>({createQuestionGroup:createQuestionGroupMock,attachQuestionToGroup:attachQuestionToGroupMock}));
import {importQuestionBatch,parseQuestionBatchDocument} from "./question-batch-import";
import type {TeacherSession} from "@/server/auth/session";

const actor={kind:"teacher",staffUserId:"teacher-1",schoolId:"school-1",role:"TEACHER"} as TeacherSession;
const valid={title:"Lokasi gunung",subject:"Geografi",topic:"Vulkanisme",difficulty:"Sedang",prompt:"Gunung mana?",stimulusType:"webgis",spatialMode:"location",mapExperience:"analysis",gisTools:["buffer"],toolParameters:{buffer:{distanceMeters:500}},answers:["A","B","C","D","E"].map(id=>({id,label:`Jawaban ${id}`})),correctAnswer:"B",explanation:"Karena lokasi tersebut sesuai."};

describe("Batch Question Import validation",()=>{
  it("keeps V1 compatible and accepts every spatial-thinking mode",()=>{
    const modes=["location","condition","influence","region","hierarchy","analogy","pattern","association"];
    const result=parseQuestionBatchDocument({version:1,scope:"PRIVATE",questions:modes.map(spatialMode=>({...valid,title:spatialMode,spatialMode}))},actor);
    expect(result.version).toBe(1);expect(result.groups).toEqual([]);expect(result.errors).toEqual([]);expect(result.items).toHaveLength(8);
    expect(result.items[0]?.input).toMatchObject({stimulusType:"webgis",feedbackCorrect:valid.explanation,activityConfig:{mapExperience:"analysis",tools:["buffer"],toolParameters:{buffer:{distanceMeters:500}}}});
  });
  it("returns indexed, item-level errors without accepting malformed answers",()=>{
    const result=parseQuestionBatchDocument({version:1,questions:[{...valid,answers:[{id:"A",label:"Satu"}]},{...valid,title:"",spatialMode:"unknown"}]},actor);
    expect(result.items).toHaveLength(0);expect(result.errors).toHaveLength(2);
    expect(result.errors[0].errors).toContain("answers harus berisi tepat lima jawaban A–E.");
    expect(result.errors[1]).toMatchObject({index:1,title:"Soal 2"});
  });
  it("rejects oversized documents and unsafe tool parameters",()=>{
    expect(()=>parseQuestionBatchDocument({version:1,questions:Array.from({length:101},()=>valid)},actor)).toThrow("1–100");
    const result=parseQuestionBatchDocument({version:1,questions:[{...valid,toolParameters:{buffer:{distanceMeters:-1}}}]},actor);
    expect(result.errors[0]?.errors[0]).toContain("distanceMeters");
  });
  it("validates V2 stimulus sets and group compatibility before import",()=>{
    const result=parseQuestionBatchDocument({version:2,scope:"PRIVATE",stimulusSets:[{key:"siak-map",title:"Sungai Siak",stimulusType:"webgis"}],questions:[{...valid,groupKey:"siak-map"},{...valid,title:"Salah tipe",groupKey:"siak-map",stimulusType:"image"},{...valid,title:"Tidak ada",groupKey:"missing"}]},actor);
    expect(result.groups).toHaveLength(1);expect(result.items).toHaveLength(1);expect(result.items[0]?.groupKey).toBe("siak-map");expect(result.errors).toHaveLength(2);
    expect(result.errors[0]?.errors[0]).toContain("stimulusType soal harus sama");
    expect(result.errors[1]?.errors[0]).toContain("groupKey tidak ditemukan");
  });
  it("rejects duplicate V2 stimulus set keys as a document error",()=>{
    expect(()=>parseQuestionBatchDocument({version:2,questions:[valid],stimulusSets:[{key:"same",title:"Satu",stimulusType:"webgis"},{key:"same",title:"Dua",stimulusType:"webgis"}]},actor)).toThrow("key duplikat");
  });
  it("creates V1 drafts without creating groups",async()=>{
    createQuestionDraftMock.mockReset().mockResolvedValueOnce("question-1").mockRejectedValueOnce(new Error("Database unavailable"));createQuestionGroupMock.mockReset();attachQuestionToGroupMock.mockReset();
    const result=await importQuestionBatch(actor,{version:1,questions:[valid,{...valid,title:"Soal kedua"}]});
    expect(createQuestionGroupMock).not.toHaveBeenCalled();expect(attachQuestionToGroupMock).not.toHaveBeenCalled();expect(createQuestionDraftMock).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({total:2,created:1,failed:1,groupsCreated:0,questionIds:["question-1"]});
  });
  it("creates V2 stimulus set and attaches the draft automatically",async()=>{
    createQuestionGroupMock.mockReset().mockResolvedValueOnce("group-1");createQuestionDraftMock.mockReset().mockResolvedValueOnce("question-1");attachQuestionToGroupMock.mockReset().mockResolvedValueOnce(undefined);
    const result=await importQuestionBatch(actor,{version:2,scope:"PRIVATE",stimulusSets:[{key:"siak-map",title:"Sungai Siak",stimulusType:"webgis"}],questions:[{...valid,groupKey:"siak-map"}]});
    expect(createQuestionGroupMock).toHaveBeenCalledWith(expect.objectContaining({actor,title:"Sungai Siak",stimulusType:"webgis",scope:"PRIVATE"}));
    expect(attachQuestionToGroupMock).toHaveBeenCalledWith({actor,questionId:"question-1",groupId:"group-1",questionScope:"PRIVATE",stimulusType:"webgis"});
    expect(result).toMatchObject({total:1,created:1,failed:0,groupsCreated:1,questionIds:["question-1"],groupIds:["group-1"]});
  });
  it("does not create a dependent question when its V2 stimulus set fails",async()=>{
    createQuestionGroupMock.mockReset().mockRejectedValueOnce(new Error("no permission"));createQuestionDraftMock.mockReset();attachQuestionToGroupMock.mockReset();
    const result=await importQuestionBatch(actor,{version:2,stimulusSets:[{key:"blocked",title:"Blocked",stimulusType:"webgis"}],questions:[{...valid,groupKey:"blocked"}]});
    expect(createQuestionDraftMock).not.toHaveBeenCalled();expect(result).toMatchObject({created:0,failed:1,groupsCreated:0});
    expect(result.errors[0]?.errors[0]).toContain("Stimulus Set 'blocked' gagal dibuat");
  });
});
