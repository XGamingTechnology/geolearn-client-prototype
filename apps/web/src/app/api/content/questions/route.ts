import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { createQuestionDraft } from "@/server/content/service";
import { replaceQuestionDraftDatasetBindings } from "@/server/content/question-datasets";
import { replaceQuestionDraftMediaBindings } from "@/server/content/question-media";

function answer(form:FormData,id:"A"|"B"|"C"|"D"|"E"){return {id,label:String(form.get("answer_"+id)??"").trim()};}

function activityConfig(form:FormData){
  const stimulus=String(form.get("stimulusType")??"text");
  const tool=String(form.get("requiredGisTool")??"").trim();
  if(stimulus!=="webgis"||!tool)return {};
  const distance=Number(form.get("bufferDistance")??500);
  return {tools:[tool],requiredActions:[{tool,parameters:tool==="buffer"?{distanceMeters:Number.isFinite(distance)&&distance>0?distance:500}:{}}]};
}

export async function POST(request:NextRequest){
  try{
    const actor=await requireTeacherSession();
    const form=await request.formData();
    const correct=String(form.get("correctAnswer")??"A") as "A"|"B"|"C"|"D"|"E";
    const id=await createQuestionDraft({
      actor,
      title:String(form.get("title")??""),
      subject:String(form.get("subject")??""),
      topic:String(form.get("topic")??""),
      scope:String(form.get("scope")??"PRIVATE"),
      spatialMode:String(form.get("spatialMode")??"location"),
      difficulty:String(form.get("difficulty")??""),
      prompt:String(form.get("prompt")??""),
      stimulusType:String(form.get("stimulusType")??"text"),
      answers:["A","B","C","D","E"].map((x)=>answer(form,x as "A"|"B"|"C"|"D"|"E")),
      correctAnswer:correct,
      feedbackCorrect:String(form.get("feedbackCorrect")??""),
      feedbackIncorrect:String(form.get("feedbackIncorrect")??""),
      activityConfig:activityConfig(form),
    });
    await replaceQuestionDraftDatasetBindings(actor,id,[
      {datasetId:String(form.get("sourceDatasetId")??""),role:"SOURCE"},
      {datasetId:String(form.get("targetDatasetId")??""),role:"TARGET"},
    ]);
    await replaceQuestionDraftMediaBindings(actor,id,[
      {mediaAssetId:String(form.get("stimulusMediaId")??""),role:"STIMULUS",altText:String(form.get("mediaAltText")??""),caption:String(form.get("mediaCaption")??"")},
    ]);
    return NextResponse.redirect(new URL("/teacher/questions/"+id,request.url),303);
  }catch{
    return NextResponse.redirect(new URL("/teacher/questions/new?status=error",request.url),303);
  }
}
