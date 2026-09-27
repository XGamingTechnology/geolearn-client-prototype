"use client";

import {useState,type FormEvent} from "react";
import Link from "next/link";
import styles from "./question-batch-import.module.css";

type Result={total:number;created:number;failed:number;questionIds:string[];errors:Array<{index:number;title:string;errors:string[]}>};
type ErrorResponse={error:string};

export function QuestionBatchImport(){
  const [result,setResult]=useState<Result|null>(null);const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError("");setResult(null);
    const form=new FormData(event.currentTarget);
    try{
      const response=await fetch("/api/content/questions/batch-import",{method:"POST",body:form});
      const body=await response.json() as Result|ErrorResponse;
      if(!response.ok&&"error" in body)throw new Error(body.error||"Impor soal gagal.");
      if(!("total" in body))throw new Error("Respons impor tidak valid.");
      setResult(body);
    }catch(cause){setError(cause instanceof Error?cause.message:"Impor soal gagal.");}
    finally{setBusy(false);}
  }
  return <>
    <form className={styles.form} onSubmit={submit}>
      <label htmlFor="batch-file"><strong>File JSON</strong><span>Maksimal 1 MB dan 100 soal per file.</span></label>
      <input id="batch-file" name="file" type="file" accept="application/json,.json" required disabled={busy}/>
      <button type="submit" disabled={busy}>{busy?"Mengimpor…":"Validasi & impor draft"}</button>
    </form>
    {error&&<section className={styles.error} role="alert"><strong>Impor belum berhasil</strong><p>{error}</p></section>}
    {result&&<section className={styles.summary} aria-live="polite">
      <h2>Ringkasan impor</h2><div className={styles.counts}><span><strong>{result.total}</strong>Total</span><span><strong>{result.created}</strong>Draft dibuat</span><span><strong>{result.failed}</strong>Gagal</span></div>
      {result.created>0&&<p>{result.created} soal dan QuestionVersion berhasil dibuat sebagai <strong>DRAFT</strong>. Tidak ada soal yang dipublish otomatis.</p>}
      {result.questionIds.length>0&&<ul className={styles.links}>{result.questionIds.map((id,index)=><li key={id}><Link href={`/teacher/questions/${id}`}>Buka draft {index+1}</Link></li>)}</ul>}
      {result.errors.length>0&&<div className={styles.failures}><h3>Perbaiki item berikut</h3><ol>{result.errors.map(item=><li key={`${item.index}-${item.title}`}><strong>Item {item.index+1}: {item.title}</strong><ul>{item.errors.map(message=><li key={message}>{message}</li>)}</ul></li>)}</ol></div>}
    </section>}
  </>;
}
