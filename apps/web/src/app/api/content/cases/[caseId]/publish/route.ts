import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { publishCaseDraft } from "@/server/content/service";
import { publicRedirectUrl } from "@/server/http/public-url";

export async function POST(request:NextRequest,{params}:{params:Promise<{caseId:string}>}){
  const {caseId}=await params;
  try{
    const actor=await requireTeacherSession();
    await publishCaseDraft(actor,caseId);
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/cases/"+caseId+"?status=published"),303);
  }catch{
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/cases/"+caseId+"?status=error"),303);
  }
}
