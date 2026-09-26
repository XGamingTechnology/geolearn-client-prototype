import { NextRequest } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { createCaseDraft } from "@/server/content/service";

function seeOther(path:string){return new Response(null,{status:303,headers:{Location:path}});}

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
    return seeOther(`/teacher/cases/${id}`);
  }catch{
    return seeOther("/teacher/cases?status=error");
  }
}
