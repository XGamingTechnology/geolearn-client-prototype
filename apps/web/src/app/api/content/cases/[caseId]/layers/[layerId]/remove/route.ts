import { requireTeacherSession } from "@/server/auth/session";
import { removeCaseLayer } from "@/server/content/case-workspace";

function seeOther(path:string){return new Response(null,{status:303,headers:{Location:path}});}

export async function POST(_request:Request,{params}:{params:Promise<{caseId:string;layerId:string}>}){
  const {caseId,layerId}=await params;
  try{
    const actor=await requireTeacherSession();
    await removeCaseLayer(actor,caseId,layerId);
    return seeOther(`/teacher/cases/${caseId}?status=layer-removed`);
  }catch{
    return seeOther(`/teacher/cases/${caseId}?status=error`);
  }
}
