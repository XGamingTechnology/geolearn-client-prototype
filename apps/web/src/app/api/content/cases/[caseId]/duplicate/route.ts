import { requireTeacherSession } from "@/server/auth/session";
import { duplicateCaseWorkspace } from "@/server/content/case-workspace";

function seeOther(path:string){return new Response(null,{status:303,headers:{Location:path}});}

export async function POST(_request:Request,{params}:{params:Promise<{caseId:string}>}){
  const {caseId}=await params;
  try{
    const actor=await requireTeacherSession();
    const newId=await duplicateCaseWorkspace(actor,caseId);
    return seeOther(`/teacher/cases/${newId}`);
  }catch{
    return seeOther(`/teacher/cases/${caseId}?status=error`);
  }
}
