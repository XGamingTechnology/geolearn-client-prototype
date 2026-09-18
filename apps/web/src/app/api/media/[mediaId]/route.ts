import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { currentSession } from "@/server/auth/session";
import { query } from "@/server/db";
import { mediaAccessDecision } from "@/server/media/access";
import { isInternalMediaKey, mediaStorage } from "@/server/media/storage";

type Asset={storageKey:string|null;mimeType:string|null;sizeBytes:number|null;schoolId:string|null;scope:string;ownerTeacherId:string|null};

function parseRange(value:string|null,size:number){
  if(!value)return null;
  const match=value.match(/^bytes=(\d*)-(\d*)$/);
  if(!match||(!match[1]&&!match[2]))return "invalid" as const;
  if(!match[1]){
    const suffix=Number(match[2]);
    if(!Number.isInteger(suffix)||suffix<=0)return "invalid" as const;
    return {start:Math.max(0,size-suffix),end:size-1};
  }
  const start=Number(match[1]);
  const requestedEnd=match[2]?Number(match[2]):size-1;
  if(!Number.isInteger(start)||!Number.isInteger(requestedEnd)||start<0||start>=size||requestedEnd<start)return "invalid" as const;
  return {start,end:Math.min(requestedEnd,size-1)};
}

export async function GET(request:NextRequest,{params}:{params:Promise<{mediaId:string}>}){
  const session=await currentSession();if(!session)return new NextResponse(null,{status:403});
  const {mediaId}=await params;
  const [asset]=await query<Asset>(`select storage_key as "storageKey",mime_type as "mimeType",size_bytes::bigint::float8 as "sizeBytes",school_id as "schoolId",scope,owner_teacher_id as "ownerTeacherId" from media_assets where id=$1 and status='ACTIVE'`,[mediaId]);
  if(!asset)return NextResponse.json({error:"File media tidak ditemukan."},{status:404});

  const decision=mediaAccessDecision(asset,session.kind==="student"
    ?{kind:"student",schoolId:session.schoolId}
    :{kind:"teacher",schoolId:session.schoolId,staffUserId:session.staffUserId});
  if(decision==="DENY")return new NextResponse(null,{status:403});
  if(decision==="CHECK_STUDENT_BINDING"&&session.kind==="student"){
    const [binding]=await query<{id:string}>(`
      select at.id
      from attempts at
      join quiz_items qi on qi.quiz_version_id=at.quiz_version_id
      join question_version_media_assets qma on qma.question_version_id=qi.question_version_id
      where at.student_id=$1 and at.enrollment_id=$2 and at.school_id=$3
        and qma.media_asset_id=$4
      limit 1
    `,[session.studentId,session.enrollmentId,session.schoolId,mediaId]);
    if(!binding)return new NextResponse(null,{status:403});
  }

  if(!isInternalMediaKey(asset.storageKey))return NextResponse.json({error:"File media tidak ditemukan."},{status:404});
  try{
    const initial=await mediaStorage.open(asset.storageKey);
    const range=parseRange(request.headers.get("range"),initial.size);
    if(range==="invalid"){
      initial.stream.destroy();
      return new NextResponse(null,{status:416,headers:{"content-range":`bytes */${initial.size}`,"accept-ranges":"bytes"}});
    }
    const opened=range?(initial.stream.destroy(),await mediaStorage.open(asset.storageKey,range)):initial;
    const length=range?range.end-range.start+1:opened.size;
    return new NextResponse(Readable.toWeb(opened.stream) as ReadableStream,{status:range?206:200,headers:{
      "content-type":asset.mimeType??"application/octet-stream","content-length":String(length),"accept-ranges":"bytes",
      ...(range?{"content-range":`bytes ${range.start}-${range.end}/${opened.size}`}:{ }),
      "content-disposition":"inline","x-content-type-options":"nosniff","content-security-policy":"default-src 'none'; media-src 'self'","cache-control":"private, max-age=3600",
    }});
  }catch{return NextResponse.json({error:"File media tidak ditemukan."},{status:404});}
}
