import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { createCaseDraft } from "@/server/content/service";
import { publicRedirectUrl } from "@/server/http/public-url";

export async function POST(request:NextRequest){
  try{
    const actor=await requireTeacherSession();
    const form=await request.formData();
    const id=await createCaseDraft({
      actor,
      title:String(form.get("title")??""),
      description:String(form.get("description")??""),
      scope:String(form.get("scope")??"PRIVATE"),
    });
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/cases/"+id),303);
  }catch{
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/cases?status=error"),303);
  }
}
