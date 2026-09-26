import type { NextRequest } from "next/server";

function firstHeader(value:string|null){
  return value?.split(",")[0]?.trim()||null;
}

export function publicRedirectUrl(request:NextRequest,path:string){
  const forwardedHost=firstHeader(request.headers.get("x-forwarded-host"));
  const forwardedProto=firstHeader(request.headers.get("x-forwarded-proto"));
  const host=forwardedHost??firstHeader(request.headers.get("host"));
  const proto=forwardedProto??(process.env.APP_ENV==="development"?"http":"https");

  if(host&&!/[\r\n]/.test(host)&&/^[A-Za-z0-9.:[\]-]+$/.test(host)){
    return new URL(path,proto+"://"+host);
  }

  return new URL(path,request.nextUrl.origin);
}
