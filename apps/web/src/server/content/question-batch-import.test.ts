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
  });
  it("keeps V2 stimulus-set validation compatible",()=>{
    const result=parseQuestionBatchDocument({version:2,scope:"PRIVATE",stimulusSets:[{key:"siak-map",title:"Sungai Siak",stimulusType:"webgis"}],questions:[{...valid,groupKey:"siak-map"},{...valid,title:"Salah tipe",groupKey:"siak-map",stimulusType:"image"}]},actor);
    expect(result.items).toHaveLength(1);expect(result.errors).toHaveLength(1);expect(result.errors[0]?.errors[0]).toContain("stimulusType soal harus sama");
  });
  it("validates V3 groups by spatial mode while allowing different stimulus types",()=>{
    const result=parseQuestionBatchDocument({version:3,scope:"PRIVATE",questionGroups:[{key:"analogies",title:"Spatial Analogies",spatialMode:"analogy"}],questions:[{...valid,title:"A",spatialMode:"analogy",stimulusType:"webgis",groupKey:"analogies"},{...valid,title:"B",spatialMode:"analogy",stimulusType:"image",groupKey:"analogies"},{...valid,title:"C",spatialMode:"region",groupKey:"analogies"}]},actor);
    expect(result.groups).toHaveLength(1);expect(result.items).toHaveLength(2);expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.errors[0]).toContain("spatialMode soal harus sama");
  });
  it("rejects malformed answers and unsafe tool parameters",()=>{
    const malformed=parseQuestionBatchDocument({version:1,questions:[{...valid,answers:[{id:"A",label:"Satu"}]}]},actor);
    expect(malformed.errors[0]?.errors).toContain("answers harus berisi tepat lima jawaban A–E.");
    const unsafe=parseQuestionBatchDocument({version:1,questions:[{...valid,toolParameters:{buffer:{distanceMeters:-1}}}]},actor);
    expect(unsafe.errors[0]?.errors[0]).toContain("distanceMeters");
  });
  it("creates V3 group and attaches drafts using spatial mode",async()=>{
    createQuestionGroupMock.mockReset().mockResolvedValueOnce("group-1");createQuestionDraftMock.mockReset().mockResolvedValueOnce("question-1");attachQuestionToGroupMock.mockReset().mockResolvedValueOnce(undefined);
    const result=await importQuestionBatch(actor,{version:3,scope:"PRIVATE",questionGroups:[{key:"location",title:"Spatial Location",spatialMode:"location"}],questions:[{...valid,groupKey:"location"}]});
    expect(createQuestionGroupMock).toHaveBeenCalledWith(expect.objectContaining({actor,title:"Spatial Location",spatialMode:"location",scope:"PRIVATE"}));
    expect(attachQuestionToGroupMock).toHaveBeenCalledWith({actor,questionId:"question-1",groupId:"group-1",questionScope:"PRIVATE",spatialMode:"location",stimulusType:"webgis"});
    expect(result).toMatchObject({total:1,created:1,failed:0,groupsCreated:1});
  });
  it("isolates group creation failure from unrelated items",async()=>{
    createQuestionGroupMock.mockReset().mockRejectedValueOnce(new Error("no permission"));createQuestionDraftMock.mockReset();attachQuestionToGroupMock.mockReset();
    const result=await importQuestionBatch(actor,{version:3,questionGroups:[{key:"blocked",title:"Blocked",spatialMode:"location"}],questions:[{...valid,groupKey:"blocked"}]});
    expect(createQuestionDraftMock).not.toHaveBeenCalled();expect(result).toMatchObject({created:0,failed:1,groupsCreated:0});
  });
});
