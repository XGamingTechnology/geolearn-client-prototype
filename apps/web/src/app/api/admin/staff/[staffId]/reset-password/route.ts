import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { requireStaffPermission } from "@/server/auth/permissions";
import { resetStaffPassword } from "@/server/accounts/service";
import { publicRedirectUrl } from "@/server/http/public-url";

function back(request:NextRequest,status:string){return NextResponse.redirect(publicRedirectUrl(request,"/teacher/accounts?status="+status),303);}

export async function POST(request:NextRequest,{params}:{params:Promise<{staffId:string}>}){
  try{
    const actor=await requireTeacherSession();
    await requireStaffPermission(actor,"ACCOUNT_MANAGE");
    const {staffId}=await params;
    const form=await request.formData();
    await resetStaffPassword({actor,staffUserId:staffId,password:String(form.get("password")??"")});
    return back(request,"password-reset");
  }catch{
    return back(request,"error");
  }
}
