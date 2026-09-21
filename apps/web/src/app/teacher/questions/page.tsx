import Link from "next/link";
import { requireTeacherSession } from "@/server/auth/session";
import { listQuestionBankPage } from "@/server/content/question-bank";
import { listQuestionGroups } from "@/server/content/question-groups";
import { QuestionBankLifecycleAction } from "@/components/question-bank-actions";
import styles from "./question-bank.module.css";

type Params={
  status?:string;message?:string;q?:string;stimulus?:string;mode?:string;response?:string;
  difficulty?:string;versionStatus?:string;scope?:string;lifecycle?:string;groupId?:string;page?:string;
};

function hrefWith(params:Params,patch:Partial<Params>){
  const next={...params,...patch};
  const query=new URLSearchParams();
  const keys:Array<keyof Params>=["q","stimulus","mode","response","difficulty","versionStatus","scope","lifecycle","groupId","page"];
  for(const key of keys){const value=next[key];if(value)query.set(key,value);}
  const text=query.toString();
  return `/teacher/questions${text?`?${text}`:""}`;
}

export default async function QuestionsPage({searchParams}:{searchParams:Promise<Params>}) {
  const session=await requireTeacherSession();
  const params=await searchParams;
  const page=Number(params.page??1);
  const lifecycle=params.lifecycle==="ARCHIVED"?"ARCHIVED":"ACTIVE";
  const [result,groups]=await Promise.all([
    listQuestionBankPage(session,{
      search:params.q,stimulus:params.stimulus,mode:params.mode,response:params.response,
      difficulty:params.difficulty,status:params.versionStatus,scope:params.scope,lifecycle,groupId:params.groupId,page,
    }),
    listQuestionGroups(session),
  ]);
  const activeFilters=[params.q,params.stimulus,params.mode,params.response,params.difficulty,params.versionStatus,params.scope,params.groupId].filter(Boolean).length;

  return (
    <main className="dashboard catalog-page">
      <header className="catalog-header">
        <div><p className="eyebrow">Content Bank</p><h1>Bank Soal</h1><p>Cari soal standalone atau berdasarkan Stimulus Set, lalu kelola draft/published tanpa merusak QuizVersion dan Attempt lama.</p></div>
        <div className="row-actions"><Link className="button button-secondary" href="/teacher/questions/groups">Stimulus Set</Link><Link className="button" href="/teacher/questions/new">+ Soal Standalone</Link></div>
      </header>

      {params.status==="deleted"&&<p className="account-alert success">Draft berhasil dihapus.</p>}
      {params.status==="archived"&&<p className="account-alert success">Soal published berhasil diarsipkan.</p>}
      {params.status==="restored"&&<p className="account-alert success">Soal berhasil dikembalikan ke Bank Soal aktif.</p>}
      {params.status==="error"&&<p className="account-alert error">{params.message||"Operasi soal gagal."}</p>}

      <div className="scope-tabs">
        <Link className={lifecycle==="ACTIVE"?"active":""} href={hrefWith(params,{lifecycle:undefined,page:"1"})}>Soal Aktif</Link>
        <Link className={lifecycle==="ARCHIVED"?"active":""} href={hrefWith(params,{lifecycle:"ARCHIVED",page:"1"})}>Diarsipkan</Link>
      </div>

      <form className={styles.filterPanel} method="get">
        {lifecycle==="ARCHIVED"&&<input type="hidden" name="lifecycle" value="ARCHIVED"/>}
        <div className={styles.searchRow}>
          <label><span>Cari soal / stimulus</span><input defaultValue={params.q??""} name="q" placeholder="Judul soal, Stimulus Set, topic, subject, atau prompt…"/></label>
          <button className="button" type="submit">Terapkan Filter</button>
          {activeFilters>0&&<Link className="button button-secondary" href={lifecycle==="ARCHIVED"?"/teacher/questions?lifecycle=ARCHIVED":"/teacher/questions"}>Reset ({activeFilters})</Link>}
        </div>
        <div className={styles.filterGrid}>
          <label><span>Stimulus Set</span><select defaultValue={params.groupId??""} name="groupId"><option value="">Semua</option>{groups.map((group)=><option key={group.id} value={group.id}>{group.title}</option>)}</select></label>
          <label><span>Stimulus</span><select defaultValue={params.stimulus??""} name="stimulus"><option value="">Semua</option><option value="text">Text</option><option value="image">Image</option><option value="video">Video</option><option value="webgis">WebGIS</option></select></label>
          <label><span>Spatial Thinking</span><select defaultValue={params.mode??""} name="mode"><option value="">Semua</option><option value="location">Location</option><option value="condition">Condition</option><option value="influence">Influence</option><option value="region">Region</option><option value="hierarchy">Hierarchy</option><option value="analogy">Analogy</option><option value="pattern">Pattern</option><option value="association">Association</option></select></label>
          <label><span>Response</span><select defaultValue={params.response??""} name="response"><option value="">Semua</option><option value="multiple-choice">Multiple Choice</option><option value="draw-point">Draw Point</option><option value="draw-line">Draw Line</option><option value="draw-polygon">Draw Polygon</option><option value="feature-select">Select Feature</option></select></label>
          <label><span>Kesulitan</span><select defaultValue={params.difficulty??""} name="difficulty"><option value="">Semua</option><option value="Mudah">Mudah</option><option value="Sedang">Sedang</option><option value="Sulit">Sulit</option></select></label>
          <label><span>Versi</span><select defaultValue={params.versionStatus??""} name="versionStatus"><option value="">Semua</option><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select></label>
          <label><span>Scope</span><select defaultValue={params.scope??""} name="scope"><option value="">Semua</option><option value="SYSTEM">System</option><option value="SCHOOL">School</option><option value="PRIVATE">My Bank</option></select></label>
        </div>
      </form>

      <div className={styles.resultMeta}><strong>{result.total}</strong><span>{lifecycle==="ARCHIVED"?"soal arsip":"soal aktif"} ditemukan</span><small>Halaman {result.page} dari {result.pageCount}</small></div>

      <section className="question-bank-list">
        {result.items.map((q)=>(
          <article className="question-bank-row" key={q.id}>
            <div className="question-thumb">{q.stimulusType==="webgis"?"◎":q.stimulusType==="video"?"▶":q.stimulusType==="image"?"▣":"T"}</div>
            <div className="question-main">
              <div className="question-tags">{q.groupTitle&&<span>Set: {q.groupTitle}</span>}<span>{q.spatialMode??"-"}</span><span>{q.stimulusType??"-"}</span><span>{q.responseType??"-"}</span></div>
              <h2>{q.title}</h2>
              <p>{q.difficulty??"-"} · {q.scope} · {q.versionNumber?"v"+q.versionNumber:"-"}{q.topic?` · ${q.topic}`:""}</p>
              {q.prompt&&<small className={styles.promptPreview}>{q.prompt}</small>}
            </div>
            <div className="question-status"><span className={q.versionStatus==="PUBLISHED"?"publish":"draft"}>{q.versionStatus??"DRAFT"}</span></div>
            <div className={styles.actions}>
              {lifecycle==="ACTIVE"&&<Link className="question-action" href={"/teacher/questions/"+q.id}>Open</Link>}
              {lifecycle==="ACTIVE"&&q.groupId&&<Link className="question-action" href={`/teacher/questions/new?groupId=${q.groupId}`}>+ Same Set</Link>}
              {lifecycle==="ACTIVE"&&q.versionStatus==="PUBLISHED"&&<form action={"/api/content/questions/"+q.id+"/duplicate"} method="post"><button className="question-action" type="submit">Duplicate</button></form>}
              {lifecycle==="ACTIVE"&&q.versionStatus==="DRAFT"&&!q.hasPublished&&<QuestionBankLifecycleAction action={`/api/content/questions/${q.id}/delete`} label="Delete" confirmText={`Hapus draft “${q.title}” secara permanen? Tindakan ini tidak dapat dibatalkan.`} tone="danger"/>}
              {lifecycle==="ACTIVE"&&q.hasPublished&&<QuestionBankLifecycleAction action={`/api/content/questions/${q.id}/archive`} label="Archive" confirmText={`Arsipkan “${q.title}”? Soal tidak lagi muncul di Bank Soal aktif, tetapi versi published tetap dipertahankan untuk Quiz/Attempt lama.`}/>}            
              {lifecycle==="ARCHIVED"&&<QuestionBankLifecycleAction action={`/api/content/questions/${q.id}/restore`} label="Unarchive" confirmText={`Kembalikan “${q.title}” ke Bank Soal aktif?`}/>}            
            </div>
          </article>
        ))}
      </section>

      {!result.items.length&&<div className="empty-state"><strong>{lifecycle==="ARCHIVED"?"Belum ada soal diarsipkan.":"Tidak ada soal yang cocok."}</strong><p>{lifecycle==="ARCHIVED"?"Soal published yang diarsipkan akan muncul di sini.":"Ubah pencarian/filter atau buat soal baru."}</p></div>}

      {result.pageCount>1&&<nav className={styles.pagination} aria-label="Pagination Bank Soal">
        <Link aria-disabled={result.page<=1} className={result.page<=1?styles.disabled:""} href={result.page<=1?hrefWith(params,{page:"1"}):hrefWith(params,{page:String(result.page-1)})}>← Sebelumnya</Link>
        <div>{Array.from({length:result.pageCount},(_,index)=>index+1).slice(Math.max(0,result.page-3),Math.min(result.pageCount,result.page+2)).map((item)=><Link className={item===result.page?styles.activePage:""} href={hrefWith(params,{page:String(item)})} key={item}>{item}</Link>)}</div>
        <Link aria-disabled={result.page>=result.pageCount} className={result.page>=result.pageCount?styles.disabled:""} href={result.page>=result.pageCount?hrefWith(params,{page:String(result.pageCount)}):hrefWith(params,{page:String(result.page+1)})}>Berikutnya →</Link>
      </nav>}
    </main>
  );
}
