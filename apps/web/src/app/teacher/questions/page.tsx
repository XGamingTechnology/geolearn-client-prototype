import Link from "next/link";
import { requireTeacherSession } from "@/server/auth/session";
import { listQuestionBankPage } from "@/server/content/question-bank";
import { QuestionBankLifecycleAction } from "@/components/question-bank-actions";
import styles from "./question-bank.module.css";

type Params={
  status?:string;message?:string;q?:string;stimulus?:string;mode?:string;response?:string;
  difficulty?:string;versionStatus?:string;scope?:string;page?:string;
};

function hrefWith(params:Params,patch:Partial<Params>){
  const next={...params,...patch};
  const query=new URLSearchParams();
  const keys:Array<keyof Params>=["q","stimulus","mode","response","difficulty","versionStatus","scope","page"];
  for(const key of keys){const value=next[key];if(value)query.set(key,value);}
  const text=query.toString();
  return `/teacher/questions${text?`?${text}`:""}`;
}

export default async function QuestionsPage({searchParams}:{searchParams:Promise<Params>}) {
  const session=await requireTeacherSession();
  const params=await searchParams;
  const page=Number(params.page??1);
  const result=await listQuestionBankPage(session,{
    search:params.q,stimulus:params.stimulus,mode:params.mode,response:params.response,
    difficulty:params.difficulty,status:params.versionStatus,scope:params.scope,page,
  });
  const activeFilters=[params.q,params.stimulus,params.mode,params.response,params.difficulty,params.versionStatus,params.scope].filter(Boolean).length;

  return (
    <main className="dashboard catalog-page">
      <header className="catalog-header">
        <div><p className="eyebrow">Content Bank</p><h1>Bank Soal</h1><p>Cari, filter, kelola draft, dan arsipkan soal published tanpa merusak QuizVersion/Attempt lama.</p></div>
        <Link className="button" href="/teacher/questions/new">+ Soal Baru</Link>
      </header>

      {params.status==="deleted"&&<p className="account-alert success">Draft berhasil dihapus.</p>}
      {params.status==="archived"&&<p className="account-alert success">Soal published berhasil diarsipkan.</p>}
      {params.status==="error"&&<p className="account-alert error">{params.message||"Operasi soal gagal."}</p>}

      <form className={styles.filterPanel} method="get">
        <div className={styles.searchRow}>
          <label><span>Cari soal</span><input defaultValue={params.q??""} name="q" placeholder="Judul, topic, subject, atau prompt…"/></label>
          <button className="button" type="submit">Cari & Filter</button>
          {activeFilters>0&&<Link className="button button-secondary" href="/teacher/questions">Reset ({activeFilters})</Link>}
        </div>
        <div className={styles.filterGrid}>
          <label><span>Stimulus</span><select defaultValue={params.stimulus??""} name="stimulus"><option value="">Semua</option><option value="text">Text</option><option value="image">Image</option><option value="video">Video</option><option value="webgis">WebGIS</option></select></label>
          <label><span>Spatial Thinking</span><select defaultValue={params.mode??""} name="mode"><option value="">Semua</option><option value="location">Location</option><option value="condition">Condition</option><option value="influence">Influence</option><option value="region">Region</option><option value="hierarchy">Hierarchy</option><option value="analogy">Analogy</option><option value="pattern">Pattern</option><option value="association">Association</option></select></label>
          <label><span>Response</span><select defaultValue={params.response??""} name="response"><option value="">Semua</option><option value="multiple-choice">Multiple Choice</option><option value="draw-point">Draw Point</option><option value="draw-line">Draw Line</option><option value="draw-polygon">Draw Polygon</option><option value="feature-select">Select Feature</option></select></label>
          <label><span>Kesulitan</span><select defaultValue={params.difficulty??""} name="difficulty"><option value="">Semua</option><option value="Mudah">Mudah</option><option value="Sedang">Sedang</option><option value="Sulit">Sulit</option></select></label>
          <label><span>Status</span><select defaultValue={params.versionStatus??""} name="versionStatus"><option value="">Semua</option><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select></label>
          <label><span>Scope</span><select defaultValue={params.scope??""} name="scope"><option value="">Semua</option><option value="SYSTEM">System</option><option value="SCHOOL">School</option><option value="PRIVATE">My Bank</option></select></label>
        </div>
      </form>

      <div className={styles.resultMeta}><strong>{result.total}</strong><span>soal ditemukan</span><small>Halaman {result.page} dari {result.pageCount}</small></div>

      <section className="question-bank-list">
        {result.items.map((q)=>(
          <article className="question-bank-row" key={q.id}>
            <div className="question-thumb">{q.stimulusType==="webgis"?"◎":q.stimulusType==="video"?"▶":q.stimulusType==="image"?"▣":"T"}</div>
            <div className="question-main">
              <div className="question-tags"><span>{q.spatialMode??"-"}</span><span>{q.stimulusType??"-"}</span><span>{q.responseType??"-"}</span></div>
              <h2>{q.title}</h2>
              <p>{q.difficulty??"-"} · {q.scope} · {q.versionNumber?"v"+q.versionNumber:"-"}{q.topic?` · ${q.topic}`:""}</p>
              {q.prompt&&<small className={styles.promptPreview}>{q.prompt}</small>}
            </div>
            <div className="question-status"><span className={q.versionStatus==="PUBLISHED"?"publish":"draft"}>{q.versionStatus??"DRAFT"}</span></div>
            <div className={styles.actions}>
              <Link className="question-action" href={"/teacher/questions/"+q.id}>Open</Link>
              {q.versionStatus==="PUBLISHED"&&<form action={"/api/content/questions/"+q.id+"/duplicate"} method="post"><button className="question-action" type="submit">Duplicate</button></form>}
              {q.versionStatus==="DRAFT"&&!q.hasPublished&&<QuestionBankLifecycleAction action={`/api/content/questions/${q.id}/delete`} label="Delete" confirmText={`Hapus draft “${q.title}” secara permanen? Tindakan ini tidak dapat dibatalkan.`} tone="danger"/>}
              {q.hasPublished&&<QuestionBankLifecycleAction action={`/api/content/questions/${q.id}/archive`} label="Archive" confirmText={`Arsipkan “${q.title}”? Soal tidak lagi muncul di Bank Soal aktif, tetapi versi published tetap dipertahankan untuk Quiz/Attempt lama.`}/>}            
            </div>
          </article>
        ))}
      </section>

      {!result.items.length&&<div className="empty-state"><strong>Tidak ada soal yang cocok.</strong><p>Ubah pencarian/filter atau buat soal baru.</p></div>}

      {result.pageCount>1&&<nav className={styles.pagination} aria-label="Pagination Bank Soal">
        <Link aria-disabled={result.page<=1} className={result.page<=1?styles.disabled:""} href={result.page<=1?hrefWith(params,{page:"1"}):hrefWith(params,{page:String(result.page-1)})}>← Sebelumnya</Link>
        <div>{Array.from({length:result.pageCount},(_,index)=>index+1).slice(Math.max(0,result.page-3),Math.min(result.pageCount,result.page+2)).map((item)=><Link className={item===result.page?styles.activePage:""} href={hrefWith(params,{page:String(item)})} key={item}>{item}</Link>)}</div>
        <Link aria-disabled={result.page>=result.pageCount} className={result.page>=result.pageCount?styles.disabled:""} href={result.page>=result.pageCount?hrefWith(params,{page:String(result.pageCount)}):hrefWith(params,{page:String(result.page+1)})}>Berikutnya →</Link>
      </nav>}
    </main>
  );
}
