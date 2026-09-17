"use client";

import { useSyncExternalStore } from "react";

const subscribe=()=>()=>{};

export function LocalDateTime({value,prefix}:{value:Date|string;prefix?:string}){
  const date=value instanceof Date?value:new Date(value);
  const iso=date.toISOString();
  const label=useSyncExternalStore(
    subscribe,
    ()=>new Intl.DateTimeFormat(undefined,{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",timeZoneName:"short"}).format(date),
    ()=>iso,
  );
  return <time dateTime={date.toISOString()}>{prefix}{label}</time>;
}
