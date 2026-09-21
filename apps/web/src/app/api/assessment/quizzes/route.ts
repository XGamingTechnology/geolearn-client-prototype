import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { createPublishedQuizFromSelection } from "@/server/assessment/quiz-authoring";
import { publicRedirectUrl } from "@/server/http/public-url";

export async function POST(request:NextRequest){
  try{
    const actor=await requireTeacherSession();
    const form=await request.formData();
    await createPublishedQuizFromSelection({
      actor,
      title:String(form.get("title")??""),
      description:String(form.get("description")??""),
      questionVersionIds:form.getAll("questionVersionIds").map(String),
    });
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/assignments?status=quiz-created"),303);
  }catch(error){
    console.error("Quiz creation failed",error);
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/assignments?status=error"),303);
  }
}
