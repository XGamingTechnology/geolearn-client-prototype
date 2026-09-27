import {beforeEach,describe,expect,it,vi} from "vitest";

const {queryMock}=vi.hoisted(()=>({queryMock:vi.fn()}));
vi.mock("@/server/db",()=>({query:queryMock}));

import {executeQuestionPreviewGis} from "./question-preview-gis";
import type {TeacherSession} from "@/server/auth/session";

const actor:TeacherSession={kind:"teacher",sessionId:"s",staffUserId:"teacher-1",schoolId:"school-1",email:"guru@example.test",role:"TEACHER",displayName:"Guru",schoolName:"Sekolah",credentialVersion:1};
const source={datasetVersionId:"source-v1",title:"Source",role:"SOURCE" as const,position:0,visible:true,opacity:1,bbox:null,style:{},dataKind:"VECTOR" as const,format:"GEOJSON",storageKey:null,defaultStyle:{},schemaJson:{}};
const target={...source,datasetVersionId:"target-v1",title:"Target",role:"TARGET" as const,position:1};
function context(tools:string[],layers= [source,target],parameters:Record<string,unknown>={}){
  queryMock.mockResolvedValueOnce([{id:"draft-v1",activityConfig:{tools,toolParameters:parameters}}]).mockResolvedValueOnce(layers);
}

describe("teacher draft GIS preview",()=>{
  beforeEach(()=>queryMock.mockReset());

  it("rejects access when no accessible persisted draft exists",async()=>{
    queryMock.mockResolvedValueOnce([]);
    await expect(executeQuestionPreviewGis(actor,"foreign-question","buffer")).rejects.toThrow("Access denied");
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("executes Buffer with the configured distance and never persists activity",async()=>{
    context(["buffer"],[source],{buffer:{distanceMeters:750}});
    queryMock.mockResolvedValueOnce([{geojson:{type:"FeatureCollection",features:[]},featureCount:2}]);
    await expect(executeQuestionPreviewGis(actor,"question-1","buffer")).resolves.toMatchObject({featureCount:2,distanceMeters:750});
    expect(queryMock).toHaveBeenLastCalledWith(expect.stringContaining("ST_Buffer"),["source-v1",750]);
    expect(queryMock.mock.calls.every(([sql])=>!String(sql).match(/insert into (attempts|gis_activities)/i))).toBe(true);
  });

  it.each([["overlay","Overlay"],["distance","Distance"]])("validates SOURCE/TARGET for %s",async(tool,label)=>{
    context([tool],[source]);
    await expect(executeQuestionPreviewGis(actor,"question-1",tool)).rejects.toThrow(`${label} memerlukan layer TARGET.`);
    expect(queryMock).toHaveBeenCalledTimes(2);
  });

  it("executes Overlay with SOURCE/TARGET bindings",async()=>{
    context(["overlay"]);queryMock.mockResolvedValueOnce([{geojson:{type:"FeatureCollection",features:[]},intersectionCount:3}]);
    await expect(executeQuestionPreviewGis(actor,"question-1","overlay")).resolves.toMatchObject({intersectionCount:3});
    expect(queryMock).toHaveBeenLastCalledWith(expect.stringContaining("ST_Intersection"),["source-v1","target-v1"]);
  });

  it("executes Distance with SOURCE/TARGET bindings",async()=>{
    context(["distance"]);queryMock.mockResolvedValueOnce([{distanceMeters:125,sourceFeatureId:"a",targetFeatureId:"b",geojson:{type:"FeatureCollection",features:[]}}]);
    await expect(executeQuestionPreviewGis(actor,"question-1","distance")).resolves.toMatchObject({distanceMeters:125});
    expect(queryMock).toHaveBeenLastCalledWith(expect.stringContaining("ST_ShortestLine"),["source-v1","target-v1"]);
  });

  it("returns a useful error for a tool absent from the saved draft config",async()=>{
    context([],[source]);
    await expect(executeQuestionPreviewGis(actor,"question-1","buffer")).rejects.toThrow("Tool tidak tersedia");
  });

  it("returns a useful error for an invalid saved Buffer distance",async()=>{
    context(["buffer"],[source],{buffer:{distanceMeters:-1}});
    await expect(executeQuestionPreviewGis(actor,"question-1","buffer")).rejects.toThrow("Jarak Buffer harus antara");
  });
});
