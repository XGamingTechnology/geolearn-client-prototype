import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { publishCaseDraft } from "@/server/content/service";

export async function POST(request:NextRequest,{params}:{params:Promise<{caseId:string}>}){
  const {caseId}=await params;
  try{
    const actor=await requireTeacherSession();
    await publishCaseDraft(actor,caseId);
    return NextResponse.redirect(new URL("/teacher/cases/"+caseId+"?status=published",request.url),303);
  }catch{
    return NextResponse.redirect(new URL("/teacher/cases/"+caseId+"?status=error",request.url),303);
  }
}
