import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { updateQuestionDraft } from "@/server/content/service";
import { replaceQuestionDraftDatasetBindings, type QuestionDatasetRole } from "@/server/content/question-datasets";
import { replaceQuestionDraftMediaBindings } from "@/server/content/question-media";
import { publicRedirectUrl } from "@/server/http/public-url";

const supportedTools=new Set(["buffer","overlay","distance"]);
const supportedRoles=new Set<QuestionDatasetRole>(["SOURCE","TARGET","CONTEXT"]);

function answers(form:FormData){return (["A","B","C","D","E"] as const).map(id=>({id,label:String(form.get("answer_"+id)??"").trim()})).filter(answer=>answer.label);}

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

function activityConfig(form:FormData){
  const stimulus=String(form.get("stimulusType")??"text");
  if(stimulus!=="webgis")return {};
  const tools=form.getAll("allowedGisTool").map(String).filter((tool)=>supportedTools.has(tool));
  const required=form.getAll("requiredGisTool").map(String).filter((tool)=>supportedTools.has(tool)&&tools.includes(tool));
  const distance=Number(form.get("bufferDistance")??500);
  const distanceMeters=Number.isFinite(distance)&&distance>0?Math.min(distance,100000):500;
  return {
    tools:Array.from(new Set(tools)),
    requiredActions:Array.from(new Set(required)).map((tool)=>({tool,parameters:tool==="buffer"?{distanceMeters}:{}})),
    toolParameters:tools.includes("buffer")?{buffer:{distanceMeters}}:{},
  };
}

function datasetBindings(form:FormData):Array<{datasetId:string;role:QuestionDatasetRole}>{
  const raw=String(form.get("datasetBindingsJson")??"[]");
  const value=JSON.parse(raw) as unknown;
  if(!Array.isArray(value)||value.length>50)throw new Error("Dataset bindings tidak valid.");
  return value.map((item)=>{
    if(!item||typeof item!=="object")throw new Error("Dataset bindings tidak valid.");
    const datasetId=String((item as {datasetId?:unknown}).datasetId??"").trim();
    const role=String((item as {role?:unknown}).role??"") as QuestionDatasetRole;
    if(!datasetId||!supportedRoles.has(role))throw new Error("Dataset bindings tidak valid.");
    return {datasetId,role};
  });
}

export async function POST(request:NextRequest,{params}:{params:Promise<{questionId:string}>}){
  const {questionId}=await params;
  try{
    const actor=await requireTeacherSession();
    const form=await request.formData();
    const stimulus=String(form.get("stimulusType")??"text");
    await updateQuestionDraft({
      actor,questionId,
      title:String(form.get("title")??""),
      subject:String(form.get("subject")??""),
      topic:String(form.get("topic")??""),
      spatialMode:String(form.get("spatialMode")??"location"),
      difficulty:String(form.get("difficulty")??"Sedang"),
      prompt:String(form.get("prompt")??""),
      stimulusType:stimulus,
      answers:answers(form),
      correctAnswer:String(form.get("correctAnswer")??"A") as "A"|"B"|"C"|"D"|"E",
      responseType:String(form.get("responseType")??"multiple-choice"),
      feedbackCorrect:String(form.get("feedbackCorrect")??""),
      feedbackIncorrect:String(form.get("feedbackIncorrect")??""),
      activityConfig:activityConfig(form),
      validationConfig:spatialValidationConfig(form),
    });
    await replaceQuestionDraftDatasetBindings(actor,questionId,stimulus==="webgis"?datasetBindings(form):[]);
    await replaceQuestionDraftMediaBindings(actor,questionId,stimulus==="image"||stimulus==="video"?[
      {mediaAssetId:String(form.get("stimulusMediaId")??""),role:"STIMULUS",altText:String(form.get("mediaAltText")??""),caption:String(form.get("mediaCaption")??"")},
    ]:[]);
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/questions/"+questionId+"?status=updated"),303);
  }catch{
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/questions/"+questionId+"?status=error"),303);
  }
}
