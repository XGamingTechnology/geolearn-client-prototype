import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { AuthorizationError } from "@/server/auth/authorization";
import { createQuestionDraft, type ContentScope } from "@/server/content/service";
import { attachQuestionToGroup, resolveQuestionGroupForCreate } from "@/server/content/question-groups";
import { replaceQuestionDraftDatasetBindings, type QuestionDatasetRole, type QuestionDatasetSelection } from "@/server/content/question-datasets";
import { replaceQuestionDraftMediaBindings } from "@/server/content/question-media";
import {questionActivityConfigFromForm} from "@/server/content/question-config";
import { publicRedirectUrl } from "@/server/http/public-url";

const supportedRoles=new Set<QuestionDatasetRole>(["SOURCE","TARGET","CONTEXT"]);

function answers(form:FormData){return (["A","B","C","D","E"] as const).map(id=>({id,label:String(form.get("answer_"+id)??"").trim()})).filter(answer=>answer.label);}
function failureReason(error:unknown){
  if(error instanceof AuthorizationError)return "permission";
  const message=error instanceof Error?error.message:"";
  if(/stimulus set|group|scope soal|stimulus soal/i.test(message))return "group";
  if(/dataset|binding|version|label field/i.test(message))return "dataset";
  return "save";
}
function spatialValidationConfig(form:FormData){
  const method=String(form.get("spatialValidationMethod")??"manual-review");
  if(method==="geometry-distance"){
    const maxDistanceMeters=Number(form.get("maxDistanceMeters")??100);
    return {method,maxDistanceMeters:Number.isFinite(maxDistanceMeters)&&maxDistanceMeters>=0?maxDistanceMeters:100,targetRole:"TARGET"};
  }
  if(method==="selected-feature-rule") return {method,targetRole:"TARGET"};
  if(method==="geometry-overlap"){
    const minOverlapRatio=Number(form.get("minOverlapRatio")??0.5);
    return {method,minOverlapRatio:Number.isFinite(minOverlapRatio)?Math.min(Math.max(minOverlapRatio,0),1):0.5,targetRole:"TARGET"};
  }
  return {method:"manual-review"};
}
function datasetBindings(form:FormData):QuestionDatasetSelection[]{
  const raw=String(form.get("datasetBindingsJson")??"[]");
  const value=JSON.parse(raw) as unknown;
  if(!Array.isArray(value)||value.length>50)throw new Error("Dataset bindings tidak valid.");
  return value.map((item)=>{
    if(!item||typeof item!=="object")throw new Error("Dataset bindings tidak valid.");
    const source=item as {datasetId?:unknown;role?:unknown;label?:unknown};
    const datasetId=String(source.datasetId??"").trim();
    const role=String(source.role??"") as QuestionDatasetRole;
    if(!datasetId||!supportedRoles.has(role))throw new Error("Dataset bindings tidak valid.");
    let label:QuestionDatasetSelection["label"];
    if(source.label&&typeof source.label==="object"){
      const rawLabel=source.label as {enabled?:unknown;field?:unknown;minZoom?:unknown};
      label={enabled:rawLabel.enabled===true,field:typeof rawLabel.field==="string"?rawLabel.field:null,minZoom:Number(rawLabel.minZoom??11)};
    }
    return {datasetId,role,label};
  });
}
function contentScope(value:string):ContentScope{
  if(value!=="SYSTEM"&&value!=="SCHOOL"&&value!=="PRIVATE")throw new Error("Scope tidak valid.");
  return value;
}

export async function POST(request:NextRequest){
  const groupId=String(request.nextUrl.searchParams.get("groupId")??"").trim();
  try{
    const actor=await requireTeacherSession();
    const form=await request.formData();
    const correct=String(form.get("correctAnswer")??"A") as "A"|"B"|"C"|"D"|"E";
    const stimulus=String(form.get("stimulusType")??"text");
    const scope=contentScope(String(form.get("scope")??"PRIVATE"));
    if(groupId){
      const group=await resolveQuestionGroupForCreate(actor,groupId,scope);
      if(!group||group.stimulusType!==stimulus)throw new Error("Stimulus soal harus sama dengan Stimulus Set.");
    }
    const bindings=stimulus==="webgis"?datasetBindings(form):[];
    const id=await createQuestionDraft({
      actor,title:String(form.get("title")??""),subject:String(form.get("subject")??""),topic:String(form.get("topic")??""),scope,
      spatialMode:String(form.get("spatialMode")??"location"),difficulty:String(form.get("difficulty")??"Sedang"),prompt:String(form.get("prompt")??""),stimulusType:stimulus,
      answers:answers(form),correctAnswer:correct,responseType:String(form.get("responseType")??"multiple-choice"),feedbackCorrect:String(form.get("feedbackCorrect")??""),feedbackIncorrect:String(form.get("feedbackIncorrect")??""),
      activityConfig:questionActivityConfigFromForm(form),validationConfig:spatialValidationConfig(form),
    });
    if(groupId)await attachQuestionToGroup({actor,questionId:id,groupId,questionScope:scope,stimulusType:stimulus});
    await replaceQuestionDraftDatasetBindings(actor,id,bindings);
    await replaceQuestionDraftMediaBindings(actor,id,stimulus==="image"||stimulus==="video"?[{mediaAssetId:String(form.get("stimulusMediaId")??""),role:"STIMULUS",altText:String(form.get("mediaAltText")??""),caption:String(form.get("mediaCaption")??"")}]:[]);
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/questions/"+id),303);
  }catch(error){
    console.error("Question draft creation failed",error);
    const groupQuery=groupId?`&groupId=${encodeURIComponent(groupId)}`:"";
    return NextResponse.redirect(publicRedirectUrl(request,`/teacher/questions/new?status=error&reason=${failureReason(error)}${groupQuery}`),303);
  }
}
