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

type IconName="search"|"plus"|"question"|"map"|"image"|"video"|"text"|"filter"|"archive"|"arrow"|"layers"|"assignment";

function Icon({name}:{name:IconName}){
  const common={viewBox:"0 0 24 24","aria-hidden":true} as const;
  if(name==="search")return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>;
  if(name==="plus")return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
  if(name==="question")return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.1 1.9c-1.1.8-1.6 1.2-1.6 2.6M12 17h.01"/></svg>;
  if(name==="map")return <svg {...common}><path d="m3 6 5-3 8 3 5-3v15l-5 3-8-3-5 3V6Z"/><path d="M8 3v15M16 6v15"/></svg>;
  if(name==="image")return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m5 18 5-5 3 3 2-2 4 4"/></svg>;
  if(name==="video")return <svg {...common}><rect x="3" y="5" width="14" height="14" rx="2"/><path d="m17 10 4-2v8l-4-2z"/></svg>;
  if(name==="text")return <svg {...common}><path d="M5 6h14M12 6v12M8 18h8"/></svg>;
  if(name==="filter")return <svg {...common}><path d="M4 6h16M7 12h10M10 18h4"/></svg>;
  if(name==="archive")return <svg {...common}><path d="M4 7h16v13H4zM3 4h18v3H3zM9 11h6"/></svg>;
  if(name==="layers")return <svg {...common}><path d="m12 3 8 4-8 4-8-4 8-4Z"/><path d="m4 12 8 4 8-4M4 17l8 4 8-4"/></svg>;
  if(name==="assignment")return <svg {...common}><path d="M9 4h6M9 2h6v4H9z"/><path d="M7 4H5v17h14V4h-2"/><path d="m8 12 2 2 5-5"/></svg>;
  return <svg {...common}><path d="M5 12h14M14 7l5 5-5 5"/></svg>;
}

function hrefWith(params:Params,patch:Partial<Params>){
  const next={...params,...patch};
  const query=new URLSearchParams();
  const keys:Array<keyof Params>=["q","stimulus","mode","response","difficulty","versionStatus","scope","lifecycle","groupId","page"];
  for(const key of keys){const value=next[key];if(value)query.set(key,value);}
  const text=query.toString();
  return `/teacher/questions${text?`?${text}`:""}`;
}

function stimulusIcon(type?:string|null):IconName{
  if(type==="webgis")return "map";
  if(type==="image")return "image";
  if(type==="video")return "video";
  return "text";
}

function readableStimulus(type?:string|null){
  if(type==="webgis")return "WebGIS";
  if(type==="image")return "Gambar";
  if(type==="video")return "Video";
  return "Teks";
}

function readableResponse(type?:string|null){
  const labels:Record<string,string>={"multiple-choice":"Pilihan Ganda","draw-point":"Titik di Peta","draw-line":"Garis di Peta","draw-polygon":"Area di Peta","feature-select":"Pilih Feature"};
  return type?labels[type]??type:"-";
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
  const draftCount=result.items.filter((item)=>item.versionStatus==="DRAFT").length;
  const publishedCount=result.items.filter((item)=>item.versionStatus==="PUBLISHED").length;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.kicker}>Bank Soal</span>
          <h1>Semua soal, lebih mudah ditemukan dan digunakan kembali.</h1>
          <p>Kelola soal teks, media, dan WebGIS dalam satu tempat. Buat soal baru atau pilih soal yang sudah siap untuk penugasan berikutnya.</p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryAction} href="/teacher/questions/new"><Icon name="plus"/>Buat Soal</Link>
            <Link className={styles.secondaryAction} href="/teacher/assignments"><Icon name="assignment"/>Buat Penugasan</Link>
          </div>
        </div>
        <div className={styles.heroVisual} aria-hidden="true">
          <div className={styles.heroMap}><span/><span/><span/></div>
          <div className={styles.heroCard}><Icon name="question"/><strong>Soal + Peta + Data</strong><small>Satu alur untuk pembelajaran spasial</small></div>
        </div>
      </section>

      {params.status==="deleted"&&<p className={`${styles.notice} ${styles.success}`}>Draft berhasil dihapus.</p>}
      {params.status==="archived"&&<p className={`${styles.notice} ${styles.success}`}>Soal berhasil diarsipkan.</p>}
      {params.status==="restored"&&<p className={`${styles.notice} ${styles.success}`}>Soal berhasil dikembalikan ke Bank Soal aktif.</p>}
      {params.status==="error"&&<p className={`${styles.notice} ${styles.error}`}>{params.message||"Operasi soal gagal."}</p>}

      <section className={styles.toolbar}>
        <div className={styles.tabs}>
          <Link className={lifecycle==="ACTIVE"?styles.activeTab:""} href={hrefWith(params,{lifecycle:undefined,page:"1"})}><Icon name="question"/>Soal Aktif</Link>
          <Link className={lifecycle==="ARCHIVED"?styles.activeTab:""} href={hrefWith(params,{lifecycle:"ARCHIVED",page:"1"})}><Icon name="archive"/>Arsip</Link>
        </div>
        <div className={styles.pageStats}><span><strong>{result.total}</strong> total</span>{lifecycle==="ACTIVE"&&<><span><strong>{draftCount}</strong> draft di halaman ini</span><span><strong>{publishedCount}</strong> published di halaman ini</span></>}</div>
      </section>

      <form className={styles.searchPanel} method="get">
        {lifecycle==="ARCHIVED"&&<input type="hidden" name="lifecycle" value="ARCHIVED"/>}
        <label className={styles.searchBox}><Icon name="search"/><input defaultValue={params.q??""} name="q" placeholder="Cari judul, topik, prompt, atau stimulus…"/><button type="submit">Cari</button></label>
        <details className={styles.filters} open={activeFilters>0}>
          <summary><Icon name="filter"/>Filter {activeFilters>0&&<span>{activeFilters}</span>}</summary>
          <div className={styles.filterGrid}>
            <label><span>Stimulus</span><select defaultValue={params.stimulus??""} name="stimulus"><option value="">Semua</option><option value="text">Teks</option><option value="image">Gambar</option><option value="video">Video</option><option value="webgis">WebGIS</option></select></label>
            <label><span>Spatial Thinking</span><select defaultValue={params.mode??""} name="mode"><option value="">Semua</option><option value="location">Location</option><option value="condition">Condition</option><option value="influence">Influence</option><option value="region">Region</option><option value="hierarchy">Hierarchy</option><option value="analogy">Analogy</option><option value="pattern">Pattern</option><option value="association">Association</option></select></label>
            <label><span>Jenis Jawaban</span><select defaultValue={params.response??""} name="response"><option value="">Semua</option><option value="multiple-choice">Pilihan Ganda</option><option value="draw-point">Titik di Peta</option><option value="draw-line">Garis di Peta</option><option value="draw-polygon">Area di Peta</option><option value="feature-select">Pilih Feature</option></select></label>
            <label><span>Kesulitan</span><select defaultValue={params.difficulty??""} name="difficulty"><option value="">Semua</option><option value="Mudah">Mudah</option><option value="Sedang">Sedang</option><option value="Sulit">Sulit</option></select></label>
            <label><span>Status</span><select defaultValue={params.versionStatus??""} name="versionStatus"><option value="">Semua</option><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select></label>
            <label><span>Kepemilikan</span><select defaultValue={params.scope??""} name="scope"><option value="">Semua</option><option value="SYSTEM">GeoLearn</option><option value="SCHOOL">Sekolah</option><option value="PRIVATE">Milik Saya</option></select></label>
            {groups.length>0&&<label><span>Kelompok Stimulus</span><select defaultValue={params.groupId??""} name="groupId"><option value="">Semua</option>{groups.map((group)=><option key={group.id} value={group.id}>{group.title}</option>)}</select></label>}
          </div>
          <div className={styles.filterActions}><button className={styles.applyFilter} type="submit">Terapkan Filter</button>{activeFilters>0&&<Link href={lifecycle==="ARCHIVED"?"/teacher/questions?lifecycle=ARCHIVED":"/teacher/questions"}>Reset filter</Link>}</div>
        </details>
      </form>

      <section className={styles.sectionHead}>
        <div><h2>{lifecycle==="ARCHIVED"?"Soal yang diarsipkan":"Koleksi soal Anda"}</h2><p>{result.total} soal ditemukan · halaman {result.page} dari {result.pageCount}</p></div>
        {groups.length>0&&<Link className={styles.advancedLink} href="/teacher/questions/groups"><Icon name="layers"/>Kelola Kelompok Stimulus</Link>}
      </section>

      <section className={styles.questionGrid}>
        {result.items.map((q)=>(
          <article className={styles.questionCard} key={q.id}>
            <div className={`${styles.visual} ${styles[`visual_${q.stimulusType??"text"}`]??""}`}>
              <span className={styles.visualIcon}><Icon name={stimulusIcon(q.stimulusType)}/></span>
              {q.stimulusType==="webgis"&&<div className={styles.miniMap}><i/><i/><i/></div>}
              <span className={styles.stimulusLabel}>{readableStimulus(q.stimulusType)}</span>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.cardTop}>
                <div className={styles.tags}>{q.groupTitle&&<span className={styles.groupTag}>{q.groupTitle}</span>}<span>{q.spatialMode??"Spatial"}</span><span>{q.difficulty??"-"}</span></div>
                <span className={q.versionStatus==="PUBLISHED"?styles.published:styles.draft}>{q.versionStatus==="PUBLISHED"?"Published":"Draft"}</span>
              </div>
              <h3>{q.title}</h3>
              {q.prompt&&<p className={styles.prompt}>{q.prompt}</p>}
              <div className={styles.meta}><span>{readableResponse(q.responseType)}</span><span>{q.topic||q.subject||"Geografi"}</span><span>{q.scope==="PRIVATE"?"Milik Saya":q.scope==="SCHOOL"?"Sekolah":"GeoLearn"}</span></div>
              <div className={styles.cardActions}>
                {lifecycle==="ACTIVE"&&<Link className={styles.openAction} href={"/teacher/questions/"+q.id}>Buka Soal <Icon name="arrow"/></Link>}
                <div className={styles.moreActions}>
                  {lifecycle==="ACTIVE"&&q.versionStatus==="PUBLISHED"&&<form action={"/api/content/questions/"+q.id+"/duplicate"} method="post"><button type="submit">Duplikat</button></form>}
                  {lifecycle==="ACTIVE"&&q.groupId&&<Link href={`/teacher/questions/new?groupId=${q.groupId}`}>+ Kelompok Sama</Link>}
                  {lifecycle==="ACTIVE"&&q.versionStatus==="DRAFT"&&!q.hasPublished&&<QuestionBankLifecycleAction action={`/api/content/questions/${q.id}/delete`} label="Hapus" confirmText={`Hapus draft “${q.title}” secara permanen? Tindakan ini tidak dapat dibatalkan.`} tone="danger"/>}
                  {lifecycle==="ACTIVE"&&q.hasPublished&&<QuestionBankLifecycleAction action={`/api/content/questions/${q.id}/archive`} label="Arsipkan" confirmText={`Arsipkan “${q.title}”? Versi published tetap dipertahankan untuk penugasan dan attempt lama.`}/>}            
                  {lifecycle==="ARCHIVED"&&<QuestionBankLifecycleAction action={`/api/content/questions/${q.id}/restore`} label="Pulihkan" confirmText={`Kembalikan “${q.title}” ke Bank Soal aktif?`}/>}            
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      {!result.items.length&&<div className={styles.emptyState}><span><Icon name="question"/></span><strong>{lifecycle==="ARCHIVED"?"Belum ada soal di arsip.":"Belum menemukan soal yang cocok."}</strong><p>{lifecycle==="ARCHIVED"?"Soal yang Anda arsipkan akan muncul di sini.":"Ubah pencarian atau mulai dengan membuat soal baru."}</p>{lifecycle==="ACTIVE"&&<Link className={styles.primaryAction} href="/teacher/questions/new"><Icon name="plus"/>Buat Soal Pertama</Link>}</div>}

      {result.pageCount>1&&<nav className={styles.pagination} aria-label="Pagination Bank Soal">
        <Link aria-disabled={result.page<=1} className={result.page<=1?styles.disabled:""} href={result.page<=1?hrefWith(params,{page:"1"}):hrefWith(params,{page:String(result.page-1)})}>← Sebelumnya</Link>
        <div>{Array.from({length:result.pageCount},(_,index)=>index+1).slice(Math.max(0,result.page-3),Math.min(result.pageCount,result.page+2)).map((item)=><Link className={item===result.page?styles.activePage:""} href={hrefWith(params,{page:String(item)})} key={item}>{item}</Link>)}</div>
        <Link aria-disabled={result.page>=result.pageCount} className={result.page>=result.pageCount?styles.disabled:""} href={result.page>=result.pageCount?hrefWith(params,{page:String(result.pageCount)}):hrefWith(params,{page:String(result.page+1)})}>Berikutnya →</Link>
      </nav>}
    </main>
  );
}
