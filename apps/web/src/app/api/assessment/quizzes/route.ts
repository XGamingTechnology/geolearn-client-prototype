import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { createPublishedQuiz } from "@/server/assessment/service";
import { publicRedirectUrl } from "@/server/http/public-url";

export async function POST(request:NextRequest){
  try{
    const actor=await requireTeacherSession();
    const form=await request.formData();
    await createPublishedQuiz({
      actor,
      title:String(form.get("title")??""),
      description:String(form.get("description")??""),
      questionVersionIds:form.getAll("questionVersionIds").map(String),
    });
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/assignments?status=quiz-created"),303);
  }catch{
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/assignments?status=error"),303);
  }
}
