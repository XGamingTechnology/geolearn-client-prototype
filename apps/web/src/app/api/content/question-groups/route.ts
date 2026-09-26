import { NextRequest,NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { createQuestionGroup } from "@/server/content/question-groups";
import { publicRedirectUrl } from "@/server/http/public-url";

export async function POST(request:NextRequest){
  try{
    const actor=await requireTeacherSession();
    const form=await request.formData();
    const id=await createQuestionGroup({
      actor,
      title:String(form.get("title")??""),
      description:String(form.get("description")??""),
      subject:String(form.get("subject")??""),
      topic:String(form.get("topic")??""),
      stimulusType:String(form.get("stimulusType")??"text"),
      scope:String(form.get("scope")??"PRIVATE"),
    });
    return NextResponse.redirect(publicRedirectUrl(request,`/teacher/questions/new?groupId=${encodeURIComponent(id)}`),303);
  }catch(error){
    console.error("Question group creation failed",error);
    const message=error instanceof Error?error.message:"Stimulus Set gagal dibuat.";
    return NextResponse.redirect(publicRedirectUrl(request,`/teacher/questions/groups/new?status=error&message=${encodeURIComponent(message)}`),303);
  }
}
