import Image from "next/image";
import Link from "next/link";
import { requireTeacherSession } from "@/server/auth/session";
import { listClasses } from "@/server/classes/service";
import { listTeacherAssignments } from "@/server/assessment/service";
import { listQuestionBankPage } from "@/server/content/question-bank";
import styles from "./dashboard.module.css";

type IconName = "class" | "student" | "assignment" | "question" | "result" | "spark" | "arrow" | "map" | "draft";

function Icon({ name }: { name: IconName }) {
  const common = { viewBox: "0 0 24 24", "aria-hidden": true } as const;
  if (name === "class") return <svg {...common}><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/></svg>;
  if (name === "student") return <svg {...common}><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20a5.5 5.5 0 0 1 11 0M13 16a4.5 4.5 0 0 1 8.5 2"/></svg>;
  if (name === "assignment") return <svg {...common}><path d="M9 4h6M9 2h6v4H9z"/><path d="M7 4H5v17h14V4h-2"/><path d="m8 12 2 2 5-5M8 18h8"/></svg>;
  if (name === "question") return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.1 1.9c-1.1.8-1.6 1.2-1.6 2.6M12 17h.01"/></svg>;
  if (name === "result") return <svg {...common}><path d="M4 20V11M10 20V5M16 20v-7M22 20H2"/></svg>;
  if (name === "spark") return <svg {...common}><path d="m12 2 1.7 5.2L19 9l-5.3 1.8L12 16l-1.7-5.2L5 9l5.3-1.8L12 2Z"/><path d="m19 15 .8 2.4 2.2.8-2.2.8L19 22l-.8-2.8-2.2-.8 2.2-.8L19 15Z"/></svg>;
  if (name === "map") return <svg {...common}><path d="m3 6 5-3 8 3 5-3v15l-5 3-8-3-5 3V6Z"/><path d="M8 3v15M16 6v15"/></svg>;
  if (name === "draft") return <svg {...common}><path d="M4 4h11l5 5v11H4z"/><path d="M15 4v5h5M8 14h8M8 17h5"/></svg>;
  return <svg {...common}><path d="M5 12h14M14 7l5 5-5 5"/></svg>;
}

function assignmentProgress(submitted:number,attempts:number){
  if(attempts<=0)return 0;
  return Math.min(100,Math.round((submitted/attempts)*100));
}

export default async function TeacherDashboard() {
  const session=await requireTeacherSession();
  const [classes,assignments,questionResult,draftResult]=await Promise.all([
    listClasses(session),
    listTeacherAssignments(session),
    listQuestionBankPage(session,{page:1}),
    listQuestionBankPage(session,{status:"DRAFT",page:1}),
  ]);
  const activeClasses=classes.filter((item)=>item.status==="ACTIVE");
  const studentCount=activeClasses.reduce((sum,item)=>sum+item.studentCount,0);
  const activeAssignments=assignments.filter((item)=>item.status==="ACTIVE");
  const submittedCount=assignments.reduce((sum,item)=>sum+item.submittedCount,0);
  const recentAssignments=activeAssignments.slice(0,3);
  const recentDrafts=draftResult.items.slice(0,3);

  const stats=[
    {icon:"class" as IconName,label:"Kelas Aktif",value:String(activeClasses.length),note:"kelas siap digunakan"},
    {icon:"student" as IconName,label:"Siswa",value:String(studentCount),note:"terdaftar di kelas aktif"},
    {icon:"assignment" as IconName,label:"Penugasan Aktif",value:String(activeAssignments.length),note:"sedang berjalan"},
    {icon:"result" as IconName,label:"Jawaban Masuk",value:String(submittedCount),note:"attempt telah disubmit"},
  ];

  const quickActions=[
    {href:"/teacher/questions/new",icon:"question" as IconName,title:"Buat Soal",note:"Teks, gambar, video, atau WebGIS",tone:"blue"},
    {href:"/teacher/assignments",icon:"assignment" as IconName,title:"Buat Penugasan",note:"Pilih soal dan kirim ke kelas",tone:"teal"},
    {href:"/teacher/results",icon:"result" as IconName,title:"Lihat Hasil",note:"Pantau pengerjaan dan jawaban siswa",tone:"purple"},
    {href:"/teacher/geolab",icon:"spark" as IconName,title:"Jelajahi GeoLab",note:"StoryMap, GeoChallenge, dan Map Canvas",tone:"amber"},
  ];

  return (
    <main className={styles.dashboard}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Ruang Kerja Guru</p>
          <h1>Selamat datang, {session.displayName}.</h1>
          <h2>Apa yang ingin Anda lakukan hari ini?</h2>
          <p className={styles.heroText}>Buat pengalaman belajar yang lebih bermakna dengan peta, data, dan pertanyaan yang mudah disusun dari satu ruang kerja.</p>
        </div>
        <div className={styles.heroArtwork}>
          <Image src="/teacher-dashboard-hero.svg" alt="Ilustrasi guru dengan peta geospasial GeoLearn" width={1200} height={520} priority />
        </div>
      </section>

      <section className={styles.quickActions} aria-label="Aksi utama">
        {quickActions.map((item)=>(
          <Link className={`${styles.actionCard} ${styles[item.tone]}`} href={item.href} key={item.href}>
            <div className={styles.actionTop}><span className={styles.actionIcon}><Icon name={item.icon}/></span><span className={styles.actionArrow}><Icon name="arrow"/></span></div>
            <div><h2>{item.title}</h2><p>{item.note}</p></div>
            <div className={styles.actionVisual} aria-hidden="true">
              <span/><span/><span/>
            </div>
          </Link>
        ))}
      </section>

      <section className={styles.metrics} aria-label="Ringkasan ruang guru">
        {stats.map((item)=>(
          <article className={styles.metric} key={item.label}>
            <span className={styles.metricIcon}><Icon name={item.icon}/></span>
            <div><strong>{item.value}</strong><span>{item.label}</span><small>{item.note}</small></div>
          </article>
        ))}
      </section>

      <section className={styles.contentGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHead}><div><p className={styles.kicker}>Sedang Berjalan</p><h2>Penugasan aktif</h2></div><Link href="/teacher/assignments">Lihat semua <Icon name="arrow"/></Link></div>
          {recentAssignments.length?(
            <div className={styles.assignmentList}>
              {recentAssignments.map((item)=>{
                const progress=assignmentProgress(item.submittedCount,item.attemptCount);
                return <Link className={styles.assignmentRow} href={`/teacher/results?assignment=${item.id}`} key={item.id}>
                  <span className={styles.assignmentThumb}><Icon name="map"/></span>
                  <div className={styles.assignmentMain}><strong>{item.title}</strong><small>{item.className} · {item.quizTitle}</small><span className={styles.progressTrack}><i style={{width:`${progress}%`}}/></span></div>
                  <div className={styles.assignmentStat}><strong>{item.submittedCount}/{item.attemptCount}</strong><small>{progress}% selesai</small></div>
                </Link>;
              })}
            </div>
          ):<div className={styles.emptyPanel}><span><Icon name="assignment"/></span><strong>Belum ada penugasan aktif.</strong><p>Buat penugasan untuk mulai mengirim soal ke kelas.</p><Link href="/teacher/assignments">Buat Penugasan <Icon name="arrow"/></Link></div>}
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHead}><div><p className={styles.kicker}>Lanjutkan</p><h2>Draft soal</h2></div><Link href="/teacher/questions">Bank Soal <Icon name="arrow"/></Link></div>
          {recentDrafts.length?(
            <div className={styles.draftList}>
              {recentDrafts.map((item)=><Link href={`/teacher/questions/${item.id}`} key={item.id}><span className={styles.draftIcon}><Icon name="draft"/></span><div><strong>{item.title}</strong><small>{item.stimulusType??"text"} · {item.spatialMode??"spatial thinking"}</small></div><Icon name="arrow"/></Link>)}
            </div>
          ):<div className={styles.emptyPanel}><span><Icon name="question"/></span><strong>Tidak ada draft tertunda.</strong><p>Semua soal Anda sudah siap atau dipublish.</p><Link href="/teacher/questions/new">Buat Soal Baru <Icon name="arrow"/></Link></div>}
        </article>
      </section>

      <section className={styles.geolabBanner}>
        <div className={styles.geolabCopy}><span className={styles.geolabBadge}><Icon name="spark"/> GeoLab</span><h2>Lebih dari sekadar kuis.</h2><p>Bangun cerita, permainan, dan karya peta interaktif untuk memberi pengalaman belajar spasial yang lebih kreatif.</p><Link href="/teacher/geolab">Jelajahi GeoLab <Icon name="arrow"/></Link></div>
        <div className={styles.geolabCards} aria-hidden="true"><span>StoryMap</span><span>GeoChallenge</span><span>Map Canvas</span></div>
      </section>

      <section className={styles.footerMeta}><span><strong>{questionResult.total}</strong> soal aktif tersedia di Bank Soal</span><Link href="/teacher/questions">Kelola Bank Soal <Icon name="arrow"/></Link></section>
    </main>
  );
}
