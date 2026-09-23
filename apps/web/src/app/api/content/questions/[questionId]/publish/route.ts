import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { publishQuestionDraft, updateQuestionDraft } from "@/server/content/service";
import { replaceQuestionDraftDatasetBindings, type QuestionDatasetRole, type QuestionDatasetSelection } from "@/server/content/question-datasets";
import { replaceQuestionDraftMediaBindings } from "@/server/content/question-media";
import {questionActivityConfigFromForm} from "@/server/content/question-config";
import {assertQuestionDatasetCompatibility} from "@/server/content/question-dataset-compatibility";
import { publicRedirectUrl } from "@/server/http/public-url";

const supportedRoles=new Set<QuestionDatasetRole>(["SOURCE","TARGET","CONTEXT"]);
function answers(form:FormData){return (["A","B","C","D","E"] as const).map(id=>({id,label:String(form.get("answer_"+id)??"").trim()})).filter(answer=>answer.label);}
function spatialValidationConfig(form:FormData){
  const method=String(form.get("spatialValidationMethod")??"manual-review");
  if(method==="geometry-distance")return {method,maxDistanceMeters:Number(form.get("maxDistanceMeters")??100),targetRole:"TARGET"};
  if(method==="geometry-overlap")return {method,minOverlapRatio:Number(form.get("minOverlapRatio")??.5),targetRole:"TARGET"};
  if(method==="selected-feature-rule")return {method,targetRole:"TARGET"};
  return {method:"manual-review"};
}
function datasetBindings(form:FormData):QuestionDatasetSelection[]{
  const value=JSON.parse(String(form.get("datasetBindingsJson")??"[]")) as unknown;
  if(!Array.isArray(value)||value.length>50)throw new Error("Dataset bindings tidak valid.");
  return value.map((item)=>{
    if(!item||typeof item!=="object")throw new Error("Dataset bindings tidak valid.");
    const source=item as {datasetId?:unknown;role?:unknown;label?:unknown};const datasetId=String(source.datasetId??"").trim();const role=String(source.role??"") as QuestionDatasetRole;
    if(!datasetId||!supportedRoles.has(role))throw new Error("Dataset bindings tidak valid.");
    let label:QuestionDatasetSelection["label"];
    if(source.label&&typeof source.label==="object"){const rawLabel=source.label as {enabled?:unknown;field?:unknown;minZoom?:unknown};label={enabled:rawLabel.enabled===true,field:typeof rawLabel.field==="string"?rawLabel.field:null,minZoom:Number(rawLabel.minZoom??11)};}
    return {datasetId,role,label};
  });
}

export async function POST(request:NextRequest,{params}:{params:Promise<{questionId:string}>}){
  const {questionId}=await params;
  try{
    const actor=await requireTeacherSession();const form=await request.formData();const stimulus=String(form.get("stimulusType")??"text");const responseType=String(form.get("responseType")??"multiple-choice");
    const bindings=stimulus==="webgis"?datasetBindings(form):[];const activityConfig=questionActivityConfigFromForm(form);
    await assertQuestionDatasetCompatibility({actor,bindings,activityConfig,responseType});
    await updateQuestionDraft({
      actor,questionId,title:String(form.get("title")??""),subject:String(form.get("subject")??""),topic:String(form.get("topic")??""),spatialMode:String(form.get("spatialMode")??"location"),difficulty:String(form.get("difficulty")??"Sedang"),prompt:String(form.get("prompt")??""),stimulusType:stimulus,
      answers:answers(form),correctAnswer:String(form.get("correctAnswer")??"A") as "A"|"B"|"C"|"D"|"E",responseType,
      feedbackCorrect:String(form.get("feedbackCorrect")??""),feedbackIncorrect:String(form.get("feedbackIncorrect")??""),activityConfig,validationConfig:spatialValidationConfig(form),
    });
    await replaceQuestionDraftDatasetBindings(actor,questionId,bindings);
    await replaceQuestionDraftMediaBindings(actor,questionId,stimulus==="image"||stimulus==="video"?[{mediaAssetId:String(form.get("stimulusMediaId")??""),role:"STIMULUS",altText:String(form.get("mediaAltText")??""),caption:String(form.get("mediaCaption")??"")}]:[]);
    await publishQuestionDraft(actor,questionId);
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/questions/"+questionId+"?status=published"),303);
  }catch(error){console.error("Question publish failed",error);return NextResponse.redirect(publicRedirectUrl(request,"/teacher/questions/"+questionId+"?status=error"),303);}
}
