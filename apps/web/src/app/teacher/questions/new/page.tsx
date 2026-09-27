import Link from "next/link";
import {requireTeacherSession} from "@/server/auth/session";
import {listQuestionDatasetOptions} from "@/server/content/question-datasets";
import {listMediaBank} from "@/server/content/service";
import {listQuestionGroups} from "@/server/content/question-groups";
import {QuestionBuilderLiveForm} from "@/components/question-builder-live-form";
import {StatusNotice} from "@/components/status-notice";
import styles from "./question-builder-page.module.css";

const errorMessage:Record<string,string>={
  permission:"Draft gagal dibuat karena akun ini tidak memiliki izin untuk lokasi penyimpanan yang dipilih. Gunakan Milik Saya atau akun dengan izin Bank Sekolah.",
  dataset:"Draft gagal dibuat saat menghubungkan dataset. Pastikan dataset masih aktif dan memiliki Published DatasetVersion.",
  group:"Draft gagal dibuat karena kelompok Spatial Thinking tidak valid, scope tidak sesuai, atau indikator soal berbeda.",
  save:"Draft gagal dibuat. Periksa judul, prompt, dan konfigurasi lalu coba lagi.",
};
const modeLabels:Record<string,string>={location:"Spatial Location",condition:"Spatial Condition",influence:"Spatial Influence",region:"Spatial Region",hierarchy:"Spatial Hierarchy",analogy:"Spatial Analogies",pattern:"Spatial Pattern",association:"Spatial Association"};

export default async function NewQuestionPage({searchParams}:{searchParams:Promise<{status?:string;reason?:string;groupId?:string}>}){
  const session=await requireTeacherSession();
  const [datasets,media,groups,params]=await Promise.all([listQuestionDatasetOptions(session),listMediaBank(session),listQuestionGroups(session),searchParams]);
  const {status,reason,groupId}=params;
  const group=groupId?groups.find((item)=>item.id===groupId):undefined;
  const action=group?`/api/content/questions?groupId=${encodeURIComponent(group.id)}`:"/api/content/questions";
  const initial=group?{scope:group.scope,subject:group.subject??"Geografi",topic:group.topic??"",spatialMode:group.spatialMode??"location"}:{};

  return <main className={styles.page}>
    <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/teacher/questions">Bank Soal</Link><span>/</span><strong>Buat Soal</strong></nav>
    <header className={styles.hero}><div className={styles.heroCopy}><span className={styles.kicker}>QUESTION BUILDER V2</span><h1>{group?"Tambah Soal ke Kelompok":"Buat Soal Baru"}</h1><p>{group?`Soal akan ditambahkan ke kelompok “${group.title}”. Indikator Spatial Thinking mengikuti kelompok, sedangkan stimulus tetap ditentukan pada soal ini.`:"Susun pertanyaan, Spatial Thinking, stimulus, data, interaksi, analisis GIS, jawaban, lalu periksa pengalaman siswa sebelum publish."}</p></div><span className={styles.heroBadge}>Adaptive Spatial Experience</span></header>
    {groupId&&!group&&<StatusNotice tone="error" title="Kelompok Spatial Thinking tidak tersedia" description="Kelompok tidak ditemukan atau tidak dapat diakses oleh akun ini."/>}
    {status==="error"&&<StatusNotice tone="error" title="Draft belum berhasil dibuat" description={errorMessage[reason??"save"]??errorMessage.save}/>} 
    {group&&<section className={styles.groupCard}><span>KELOMPOK SPATIAL THINKING AKTIF</span><strong>{group.title}</strong><p>{group.description||"Tanpa deskripsi."}</p><div className={styles.groupTags}><i>{group.spatialMode?modeLabels[group.spatialMode]??group.spatialMode:"Spatial Thinking"}</i><i>{group.scope}</i>{group.topic&&<i>{group.topic}</i>}</div></section>}
    {!groupId||group?<QuestionBuilderLiveForm action={action} datasets={datasets} media={media} initial={initial} isNew/>:null}
  </main>;
}
