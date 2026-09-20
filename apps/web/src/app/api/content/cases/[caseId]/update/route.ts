import { NextRequest } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { updateCaseNarrative } from "@/server/content/case-workspace";

function seeOther(path:string){return new Response(null,{status:303,headers:{Location:path}});}

export async function POST(request:NextRequest,{params}:{params:Promise<{caseId:string}>}){
  const {caseId}=await params;
  try{
    const actor=await requireTeacherSession();
    const form=await request.formData();
    await updateCaseNarrative(actor,caseId,String(form.get("narrative")??""));
    return seeOther(`/teacher/cases/${caseId}?status=saved`);
  }catch{
    return seeOther(`/teacher/cases/${caseId}?status=error`);
  }
}
