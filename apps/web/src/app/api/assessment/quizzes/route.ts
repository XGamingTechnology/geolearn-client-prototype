import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { createPublishedQuiz } from "@/server/assessment/service";

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
    return NextResponse.redirect(new URL("/teacher/assignments?status=quiz-created",request.url),303);
  }catch{
    return NextResponse.redirect(new URL("/teacher/assignments?status=error",request.url),303);
  }
}
