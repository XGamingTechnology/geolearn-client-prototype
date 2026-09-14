import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { requireStaffPermission } from "@/server/auth/permissions";
import { updateStaffAccount } from "@/server/accounts/service";

function back(request:NextRequest,status:string){return NextResponse.redirect(new URL("/teacher/accounts?status="+status,request.url),303);}

export async function POST(request:NextRequest,{params}:{params:Promise<{staffId:string}>}){
  try{
    const actor=await requireTeacherSession();
    await requireStaffPermission(actor,"ACCOUNT_MANAGE");
    const {staffId}=await params;
    const form=await request.formData();
    await updateStaffAccount({
      actor,
      staffUserId:staffId,
      displayName:String(form.get("displayName")??""),
      role:String(form.get("role")??"TEACHER"),
      status:String(form.get("status")??"ACTIVE"),
      permissions:form.getAll("permissions").map(String),
    });
    return back(request,"updated");
  }catch{
    return back(request,"error");
  }
}
