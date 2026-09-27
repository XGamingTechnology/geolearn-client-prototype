import Link from "next/link";
import {requireTeacherSession} from "@/server/auth/session";
import {QuestionBatchImport} from "@/components/question-batch-import";
import styles from "@/components/question-batch-import.module.css";

const example={version:1,scope:"PRIVATE",questions:[{title:"Contoh lokasi",subject:"Geografi",topic:"Lokasi",difficulty:"Sedang",prompt:"Objek manakah yang berada di lokasi tersebut?",stimulusType:"webgis",spatialMode:"location",answers:[{id:"A",label:"Pilihan A"},{id:"B",label:"Pilihan B"},{id:"C",label:"Pilihan C"},{id:"D",label:"Pilihan D"},{id:"E",label:"Pilihan E"}],correctAnswer:"A",explanation:"Penjelasan jawaban benar.",feedbackIncorrect:"Tinjau kembali peta.",mapExperience:"analysis",gisTools:["buffer"],toolParameters:{buffer:{distanceMeters:500}}}]};

export default async function QuestionImportPage(){
  await requireTeacherSession();
  return <main style={{maxWidth:980,margin:"0 auto",padding:"32px 24px 64px"}}>
    <nav aria-label="Breadcrumb"><Link href="/teacher/questions">Bank Soal</Link> / <strong>Impor JSON</strong></nav>
    <header><p style={{color:"#167153",fontWeight:800}}>BATCH QUESTION IMPORT V1</p><h1>Impor banyak soal sebagai draft</h1><p>Unggah satu file JSON terstruktur. Setiap item yang valid dibuat melalui alur domain Question + QuestionVersion dan tetap berstatus DRAFT.</p></header>
    <QuestionBatchImport/>
    <section className={styles.guide}><h2>Format V1</h2><p>Mode spasial: location, condition, influence, region, hierarchy, analogy, pattern, association. Scope dokumen dapat berupa PRIVATE, SCHOOL, atau SYSTEM. Dataset dan media dapat dihubungkan manual setelah impor.</p><pre>{JSON.stringify(example,null,2)}</pre></section>
  </main>;
}
