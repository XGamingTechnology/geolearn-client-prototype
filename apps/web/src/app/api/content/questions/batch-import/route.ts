import {NextRequest,NextResponse} from "next/server";
import {requireTeacherSession} from "@/server/auth/session";
import {importQuestionBatch} from "@/server/content/question-batch-import";

const MAX_FILE_BYTES=1024*1024;

export async function POST(request:NextRequest){
  try{
    const length=Number(request.headers.get("content-length")??0);
    if(length>MAX_FILE_BYTES+64*1024)throw new Error("File JSON maksimal 1 MB.");
    const actor=await requireTeacherSession();
    const form=await request.formData();const file=form.get("file");
    if(!(file instanceof File)||!file.size)throw new Error("Pilih satu file JSON untuk diimpor.");
    if(file.size>MAX_FILE_BYTES)throw new Error("File JSON maksimal 1 MB.");
    if(!file.name.toLowerCase().endsWith(".json")&&file.type!=="application/json")throw new Error("File harus berformat JSON.");
    let document:unknown;
    try{document=JSON.parse(await file.text()) as unknown;}catch{throw new Error("Isi file bukan JSON yang valid.");}
    const result=await importQuestionBatch(actor,document);
    return NextResponse.json(result,{status:result.created===0&&result.failed>0?422:200,headers:{"cache-control":"no-store"}});
  }catch(error){
    const message=error instanceof Error?error.message:"Impor soal gagal.";
    return NextResponse.json({error:message},{status:400,headers:{"cache-control":"no-store"}});
  }
}
