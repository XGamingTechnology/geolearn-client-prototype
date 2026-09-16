import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { duplicateCase } from "@/server/content/service";
import { publicRedirectUrl } from "@/server/http/public-url";

export async function POST(request:NextRequest,{params}:{params:Promise<{caseId:string}>}){
  const {caseId}=await params;
  try{
    const actor=await requireTeacherSession();
    const newId=await duplicateCase(actor,caseId);
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/cases/"+newId),303);
  }catch{
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/cases/"+caseId+"?status=error"),303);
  }
}
