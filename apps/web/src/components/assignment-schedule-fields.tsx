"use client";

import { useState } from "react";

export function localDateTimeToUtc(value:string):string{
  if(!value)return "";
  const instant=new Date(value);
  return Number.isNaN(instant.getTime())?"":instant.toISOString();
}

export function AssignmentScheduleFields(){
  const [opensAt,setOpensAt]=useState("");
  const [closesAt,setClosesAt]=useState("");
  const invalidRange=Boolean(opensAt&&closesAt&&new Date(closesAt)<=new Date(opensAt));

  return <>
    <div className="builder-two-col">
      <label>Buka<input type="datetime-local" value={opensAt} onChange={(event)=>setOpensAt(event.target.value)}/></label>
      <label>Tutup<input type="datetime-local" value={closesAt} min={opensAt||undefined} onChange={(event)=>setClosesAt(event.target.value)}/></label>
    </div>
    <input type="hidden" name="opensAt" value={localDateTimeToUtc(opensAt)}/>
    <input type="hidden" name="closesAt" value={localDateTimeToUtc(closesAt)}/>
    {invalidRange&&<p className="auth-error">Waktu tutup harus setelah waktu buka.</p>}
  </>;
}
