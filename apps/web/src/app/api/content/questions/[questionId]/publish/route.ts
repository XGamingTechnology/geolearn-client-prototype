import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { publishQuestionDraft, updateQuestionDraft } from "@/server/content/service";
import { replaceQuestionDraftDatasetBindings } from "@/server/content/question-datasets";
import { replaceQuestionDraftMediaBindings } from "@/server/content/question-media";
import { publicRedirectUrl } from "@/server/http/public-url";

export async function POST(request:NextRequest,{params}:{params:Promise<{questionId:string}>}){
  const {questionId}=await params;
  try{
    const actor=await requireTeacherSession();
    const form=await request.formData();
    const stimulus=String(form.get("stimulusType")??"text");
    const responseType=String(form.get("responseType")??"multiple-choice");
    const tool=String(form.get("requiredGisTool")??"");
    const distance=Number(form.get("bufferDistance")??500);
    const answers=(["A","B","C","D","E"] as const).map(id=>({id,label:String(form.get("answer_"+id)??"").trim()})).filter(answer=>answer.label);
    const method=String(form.get("spatialValidationMethod")??"manual-review");
    const validationConfig=method==="geometry-distance"?{method,maxDistanceMeters:Number(form.get("maxDistanceMeters")??100),targetRole:"TARGET"}:method==="geometry-overlap"?{method,minOverlapRatio:Number(form.get("minOverlapRatio")??.5),targetRole:"TARGET"}:method==="selected-feature-rule"?{method,targetRole:"TARGET"}:{method:"manual-review"};
    await updateQuestionDraft({actor,questionId,title:String(form.get("title")??""),subject:String(form.get("subject")??""),topic:String(form.get("topic")??""),spatialMode:String(form.get("spatialMode")??"location"),difficulty:String(form.get("difficulty")??""),prompt:String(form.get("prompt")??""),stimulusType:stimulus,answers,correctAnswer:String(form.get("correctAnswer")??"A") as "A"|"B"|"C"|"D"|"E",responseType,feedbackCorrect:String(form.get("feedbackCorrect")??""),feedbackIncorrect:String(form.get("feedbackIncorrect")??""),activityConfig:stimulus==="webgis"&&tool?{tools:[tool],requiredActions:[{tool,parameters:tool==="buffer"?{distanceMeters:distance}:{}}]}:{},validationConfig});
    await replaceQuestionDraftDatasetBindings(actor,questionId,stimulus==="webgis"?[{datasetId:String(form.get("sourceDatasetId")??""),role:"SOURCE"},{datasetId:String(form.get("targetDatasetId")??""),role:"TARGET"}]:[]);
    await replaceQuestionDraftMediaBindings(actor,questionId,stimulus==="image"||stimulus==="video"?[{mediaAssetId:String(form.get("stimulusMediaId")??""),role:"STIMULUS",altText:String(form.get("mediaAltText")??""),caption:String(form.get("mediaCaption")??"")}]:[]);
    await publishQuestionDraft(actor,questionId);
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/questions/"+questionId+"?status=published"),303);
  }catch{
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/questions/"+questionId+"?status=error"),303);
  }
}
