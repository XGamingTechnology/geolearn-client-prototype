"use client";

import {useEffect,useState} from "react";
import styles from "./assignment-flow-polish.module.css";

type PreviewState={url:string;title:string}|null;

export function AssignmentFlowPolish(){
  const [preview,setPreview]=useState<PreviewState>(null);

  useEffect(()=>{
    const guidedForm=document.querySelector<HTMLFormElement>('form[action="/api/assessment/guided-assignment"]');
    guidedForm?.classList.add("assignment-guided-polished");

    const handleClick=(event:MouseEvent)=>{
      const target=event.target;
      if(!(target instanceof Element))return;
      const anchor=target.closest<HTMLAnchorElement>('a[href*="/teacher/questions/"][href*="/preview?versionId="]');
      const form=document.querySelector<HTMLFormElement>('form[action="/api/assessment/guided-assignment"]');
      if(!anchor||!form?.contains(anchor))return;
      event.preventDefault();
      event.stopPropagation();
      const item=anchor.closest("article");
      const title=item?.querySelector("strong")?.textContent?.trim()||"Preview soal";
      setPreview({url:anchor.href,title});
    };

    document.addEventListener("click",handleClick,true);
    return()=>{
      document.removeEventListener("click",handleClick,true);
      guidedForm?.classList.remove("assignment-guided-polished");
    };
  },[]);

  useEffect(()=>{
    if(!preview)return;
    const handleKey=(event:KeyboardEvent)=>{if(event.key==="Escape")setPreview(null);};
    document.addEventListener("keydown",handleKey);
    return()=>document.removeEventListener("keydown",handleKey);
  },[preview]);

  if(!preview)return null;

  return <div className={styles.backdrop} role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setPreview(null);}}>
    <section className={styles.modal} role="dialog" aria-modal="true" aria-label={`Preview siswa: ${preview.title}`}>
      <header className={styles.header}>
        <div>
          <span>PREVIEW SISWA · SANDBOX</span>
          <h2>{preview.title}</h2>
          <p>Preview tetap berada di atas flow penugasan. Pilihan soal, kelas, jadwal, dan Step 3 tidak berubah.</p>
        </div>
        <button type="button" onClick={()=>setPreview(null)} aria-label="Tutup preview">Tutup ×</button>
      </header>
      <div className={styles.frameShell}>
        <iframe className={styles.frame} src={preview.url} title={`Preview siswa ${preview.title}`}/>
      </div>
      <footer className={styles.footer}>
        <span>Read-only · tidak membuat attempt, jawaban, aktivitas GIS, atau nilai.</span>
        <button type="button" onClick={()=>setPreview(null)}>Kembali ke Review & Publish</button>
      </footer>
    </section>
  </div>;
}
