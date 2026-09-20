import { NextRequest } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { addDatasetToCase } from "@/server/content/case-workspace";

function seeOther(path:string){return new Response(null,{status:303,headers:{Location:path}});}

export async function POST(request:NextRequest,{params}:{params:Promise<{caseId:string}>}){
  const {caseId}=await params;
  try{
    const actor=await requireTeacherSession();
    const form=await request.formData();
    await addDatasetToCase(actor,caseId,String(form.get("datasetId")??""),String(form.get("role")??"CONTEXT"));
    return seeOther(`/teacher/cases/${caseId}?status=layer-added`);
  }catch{
    return seeOther(`/teacher/cases/${caseId}?status=error`);
  }
}
