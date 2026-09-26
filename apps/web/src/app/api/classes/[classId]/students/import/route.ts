import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { addStudentToClass } from "@/server/classes/service";
import { parseStudentCsv } from "@/server/classes/csv";

export async function POST(request:NextRequest,{params}:{params:Promise<{classId:string}>}){
  try{
    const actor=await requireTeacherSession();
    const {classId}=await params;
    const form=await request.formData();
    const file=form.get("file");
    if(!(file instanceof File)||file.size>1024*1024) return NextResponse.json({error:"CSV file required (max 1 MB)"},{status:400});
    const rows=parseStudentCsv(await file.text());
    if(!rows.length) return NextResponse.json({error:"CSV contains no students"},{status:400});

    const credentials=[];
    for(const row of rows){
      credentials.push(await addStudentToClass({actor,classId,fullName:row.fullName,requestedLoginId:row.loginId??null}));
    }
    return NextResponse.json({count:credentials.length,credentials});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Import failed"},{status:400});
  }
}
