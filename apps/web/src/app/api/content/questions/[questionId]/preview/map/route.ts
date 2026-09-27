import {NextRequest,NextResponse} from "next/server";
import {requireTeacherSession} from "@/server/auth/session";
import {getExactQuestionVersionMapPreview} from "@/server/content/question-datasets";

export async function POST(request:NextRequest,{params}:{params:Promise<{questionId:string}>}){try{const actor=await requireTeacherSession();const {questionId}=await params;const versionId=request.nextUrl.searchParams.get("versionId");if(!versionId)throw new Error("QuestionVersion wajib dipilih.");return NextResponse.json(await getExactQuestionVersionMapPreview(actor,questionId,versionId),{headers:{"cache-control":"no-store"}});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Preview peta tidak tersedia."},{status:400});}}
