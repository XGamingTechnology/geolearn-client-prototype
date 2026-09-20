import { requireTeacherSession } from "@/server/auth/session";
import { duplicateCase } from "@/server/content/service";

function seeOther(path:string){return new Response(null,{status:303,headers:{Location:path}});}

export async function POST(_request:Request,{params}:{params:Promise<{caseId:string}>}){
  const {caseId}=await params;
  try{
    const actor=await requireTeacherSession();
    const newId=await duplicateCase(actor,caseId);
    return seeOther(`/teacher/cases/${newId}`);
  }catch{
    return seeOther(`/teacher/cases/${caseId}?status=error`);
  }
}
