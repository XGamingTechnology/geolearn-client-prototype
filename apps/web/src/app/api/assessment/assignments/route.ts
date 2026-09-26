import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { createAssignment } from "@/server/assessment/service";
import { publicRedirectUrl } from "@/server/http/public-url";

export async function POST(request:NextRequest){
  try{
    const actor=await requireTeacherSession();
    const form=await request.formData();
    await createAssignment({
      actor,
      classId:String(form.get("classId")??""),
      quizVersionId:String(form.get("quizVersionId")??""),
      title:String(form.get("title")??""),
      instructions:String(form.get("instructions")??""),
      opensAt:String(form.get("opensAt")??""),
      closesAt:String(form.get("closesAt")??""),
      attemptLimit:Number(form.get("attemptLimit")??1),
      resultVisibility:String(form.get("resultVisibility")??"AFTER_SUBMIT"),
    });
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/assignments?status=assignment-created"),303);
  }catch{
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/assignments?status=error"),303);
  }
}
