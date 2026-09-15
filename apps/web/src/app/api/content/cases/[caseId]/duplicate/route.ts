import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { duplicateCase } from "@/server/content/service";

export async function POST(request:NextRequest,{params}:{params:Promise<{caseId:string}>}){
  const {caseId}=await params;
  try{
    const actor=await requireTeacherSession();
    const newId=await duplicateCase(actor,caseId);
    return NextResponse.redirect(new URL("/teacher/cases/"+newId,request.url),303);
  }catch{
    return NextResponse.redirect(new URL("/teacher/cases/"+caseId+"?status=error",request.url),303);
  }
}
