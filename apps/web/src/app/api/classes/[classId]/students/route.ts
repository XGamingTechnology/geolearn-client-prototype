import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { addStudentToClass } from "@/server/classes/service";

export async function POST(request:NextRequest,{params}:{params:Promise<{classId:string}>}){
  try{
    const actor=await requireTeacherSession();
    const {classId}=await params;
    const body=await request.json() as {fullName?:string;loginId?:string};
    const result=await addStudentToClass({actor,classId,fullName:String(body.fullName??""),requestedLoginId:body.loginId||null});
    return NextResponse.json(result,{status:201});
  }catch{
    return NextResponse.json({error:"Unable to add student"},{status:400});
  }
}
