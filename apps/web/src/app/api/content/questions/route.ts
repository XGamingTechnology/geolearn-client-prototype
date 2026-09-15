import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { createQuestionDraft } from "@/server/content/service";

function answer(form:FormData,id:"A"|"B"|"C"|"D"|"E"){return {id,label:String(form.get("answer_"+id)??"").trim()};}

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
    });
    return NextResponse.redirect(new URL("/teacher/questions/"+id,request.url),303);
  }catch{
    return NextResponse.redirect(new URL("/teacher/questions/new?status=error",request.url),303);
  }
}
