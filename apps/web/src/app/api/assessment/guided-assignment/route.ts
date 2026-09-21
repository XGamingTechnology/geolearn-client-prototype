import {NextRequest,NextResponse} from "next/server";
import {requireTeacherSession} from "@/server/auth/session";
import {createGuidedAssignment} from "@/server/assessment/guided-assignment";
import {publicRedirectUrl} from "@/server/http/public-url";

export async function POST(request:NextRequest){
  try{
    const actor=await requireTeacherSession();
    const form=await request.formData();
    await createGuidedAssignment({
      actor,
      title:String(form.get("title")??""),
      instructions:String(form.get("instructions")??""),
      classId:String(form.get("classId")??""),
      questionVersionIds:form.getAll("questionVersionIds").map(String),
      opensAt:String(form.get("opensAt")??""),
      closesAt:String(form.get("closesAt")??""),
      attemptLimit:Number(form.get("attemptLimit")??1),
      resultVisibility:String(form.get("resultVisibility")??"AFTER_SUBMIT"),
    });
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/assignments?status=guided-created"),303);
  }catch(error){
    console.error("Guided assignment creation failed",error);
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/assignments?status=guided-error"),303);
  }
}
