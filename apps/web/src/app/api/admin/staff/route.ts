import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { requireStaffPermission } from "@/server/auth/permissions";
import { createStaffAccount } from "@/server/accounts/service";

function back(request:NextRequest,status:string){return NextResponse.redirect(new URL("/teacher/accounts?status="+status,request.url),303);}

export async function POST(request:NextRequest){
  try{
    const actor=await requireTeacherSession();
    await requireStaffPermission(actor,"ACCOUNT_MANAGE");
    const form=await request.formData();
    const permissions=form.getAll("permissions").map(String);
    await createStaffAccount({
      actor,
      email:String(form.get("email")??""),
      displayName:String(form.get("displayName")??""),
      password:String(form.get("password")??""),
      role:String(form.get("role")??"TEACHER"),
      permissions,
    });
    return back(request,"created");
  }catch{
    return back(request,"error");
  }
}
