"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import styles from "./status-notice.module.css";

export type StatusNoticeTone="success"|"warning"|"error"|"info";

type Props={
  tone:StatusNoticeTone;
  title:string;
  description?:string;
  actionHref?:string;
  actionLabel?:string;
  dismissible?:boolean;
  autoDismissMs?:number;
};

function StatusIcon({tone}:{tone:StatusNoticeTone}){
  const common={viewBox:"0 0 24 24","aria-hidden":true} as const;
  if(tone==="success")return <svg {...common}><path d="m5 12 4 4 10-10"/></svg>;
  if(tone==="warning")return <svg {...common}><path d="M12 4 3.5 19h17L12 4Z"/><path d="M12 9v4M12 16h.01"/></svg>;
  if(tone==="error")return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>;
}

export function StatusNotice({tone,title,description,actionHref,actionLabel,dismissible=true,autoDismissMs}:Props){
  const [visible,setVisible]=useState(true);

  useEffect(()=>{
    if(!autoDismissMs)return;
    const timer=window.setTimeout(()=>setVisible(false),autoDismissMs);
    return ()=>window.clearTimeout(timer);
  },[autoDismissMs]);

  if(!visible)return null;

  return <div className={`${styles.notice} ${styles[tone]}`} role={tone==="error"||tone==="warning"?"alert":"status"} aria-live={tone==="error"?"assertive":"polite"}>
    <span className={styles.icon}><StatusIcon tone={tone}/></span>
    <div className={styles.copy}>
      <strong>{title}</strong>
      {description&&<p>{description}</p>}
    </div>
    <div className={styles.actions}>
      {actionHref&&actionLabel&&<Link href={actionHref}>{actionLabel}</Link>}
      {dismissible&&<button type="button" onClick={()=>setVisible(false)} aria-label="Tutup notifikasi"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg></button>}
    </div>
  </div>;
}
