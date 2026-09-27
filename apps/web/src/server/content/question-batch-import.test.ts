import {describe,expect,it,vi} from "vitest";

vi.mock("server-only",()=>({}));
const {createQuestionDraftMock}=vi.hoisted(()=>({createQuestionDraftMock:vi.fn()}));
vi.mock("./service",()=>({createQuestionDraft:createQuestionDraftMock}));
import {importQuestionBatch,parseQuestionBatchDocument} from "./question-batch-import";
import type {TeacherSession} from "@/server/auth/session";

const actor={kind:"teacher",staffUserId:"teacher-1",schoolId:"school-1",role:"TEACHER"} as TeacherSession;
const valid={title:"Lokasi gunung",subject:"Geografi",topic:"Vulkanisme",difficulty:"Sedang",prompt:"Gunung mana?",stimulusType:"webgis",spatialMode:"location",mapExperience:"analysis",gisTools:["buffer"],toolParameters:{buffer:{distanceMeters:500}},answers:["A","B","C","D","E"].map(id=>({id,label:`Jawaban ${id}`})),correctAnswer:"B",explanation:"Karena lokasi tersebut sesuai."};

describe("Batch Question Import V1 validation",()=>{
  it("accepts every spatial-thinking mode and maps the draft contract",()=>{
    const modes=["location","condition","influence","region","hierarchy","analogy","pattern","association"];
    const result=parseQuestionBatchDocument({version:1,scope:"PRIVATE",questions:modes.map(spatialMode=>({...valid,title:spatialMode,spatialMode}))},actor);
    expect(result.errors).toEqual([]);expect(result.items).toHaveLength(8);
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
  it("creates valid items through createQuestionDraft and reports an isolated transaction failure",async()=>{
    createQuestionDraftMock.mockReset().mockResolvedValueOnce("question-1").mockRejectedValueOnce(new Error("Database unavailable"));
    const result=await importQuestionBatch(actor,{version:1,questions:[valid,{...valid,title:"Soal kedua"}]});
    expect(createQuestionDraftMock).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({total:2,created:1,failed:1,questionIds:["question-1"]});
    expect(result.errors[0]).toMatchObject({index:1,title:"Soal kedua",errors:["Draft gagal dibuat karena kesalahan penyimpanan."]});
    expect(createQuestionDraftMock.mock.calls[0]?.[0]).toMatchObject({actor,scope:"PRIVATE",spatialMode:"location"});
  });
});
