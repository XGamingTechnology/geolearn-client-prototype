import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { currentSession } from "@/server/auth/session";
import { query } from "@/server/db";
import { isInternalMediaKey, mediaStorage } from "@/server/media/storage";

type Asset={storageKey:string|null;mimeType:string|null;sizeBytes:number|null;schoolId:string|null;scope:string;ownerTeacherId:string|null};
function parseRange(value:string|null,size:number){
  const match=value?.match(/^bytes=(\d*)-(\d*)$/);if(!match)return null;
  const start=match[1]?Number(match[1]):0;const end=match[2]?Number(match[2]):size-1;
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<start||end>=size)return "invalid" as const;
  return {start,end};
}
export async function GET(request:NextRequest,{params}:{params:Promise<{mediaId:string}>}){
  const session=await currentSession();if(!session)return new NextResponse(null,{status:403});
  const {mediaId}=await params;
  const [asset]=await query<Asset>(`select storage_key as "storageKey",mime_type as "mimeType",size_bytes::bigint::float8 as "sizeBytes",school_id as "schoolId",scope,owner_teacher_id as "ownerTeacherId" from media_assets where id=$1 and status='ACTIVE'`,[mediaId]);
  if(!asset)return NextResponse.json({error:"File media tidak ditemukan."},{status:404});
  const allowed=asset.scope==="SYSTEM"||(session.kind==="student"?asset.schoolId===session.schoolId:(asset.scope==="SCHOOL"?asset.schoolId===session.schoolId:asset.ownerTeacherId===session.staffUserId));
  if(!allowed)return new NextResponse(null,{status:403});
  if(!isInternalMediaKey(asset.storageKey))return NextResponse.json({error:"File media tidak ditemukan."},{status:404});
  try{
    const initial=await mediaStorage.open(asset.storageKey);const range=parseRange(request.headers.get("range"),initial.size);
    if(range==="invalid")return new NextResponse(null,{status:416,headers:{"content-range":`bytes */${initial.size}`}});
    const opened=range?await mediaStorage.open(asset.storageKey,range):initial;
    const length=range?range.end-range.start+1:opened.size;
    return new NextResponse(Readable.toWeb(opened.stream) as ReadableStream,{status:range?206:200,headers:{
      "content-type":asset.mimeType??"application/octet-stream","content-length":String(length),"accept-ranges":"bytes",
      ...(range?{"content-range":`bytes ${range.start}-${range.end}/${opened.size}`}:{ }),
      "content-disposition":"inline","x-content-type-options":"nosniff","content-security-policy":"default-src 'none'; media-src 'self'","cache-control":"private, max-age=3600",
    }});
  }catch{return NextResponse.json({error:"File media tidak ditemukan."},{status:404});}
}
