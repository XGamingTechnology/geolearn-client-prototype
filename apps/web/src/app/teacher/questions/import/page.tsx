import Link from "next/link";
import {requireTeacherSession} from "@/server/auth/session";
import {QuestionBatchImport} from "@/components/question-batch-import";
import styles from "@/components/question-batch-import.module.css";

const example={version:3,scope:"PRIVATE",questionGroups:[{key:"spatial-analogies",title:"Spatial Analogies",description:"Kelompok soal untuk indikator Spatial Analogies.",subject:"Geografi",topic:"Spatial Analogies",spatialMode:"analogy"}],questions:[{groupKey:"spatial-analogies",title:"Contoh analogi",subject:"Geografi",topic:"Spatial Analogies",difficulty:"Sedang",prompt:"Pasangan wilayah manakah yang menunjukkan analogi spasial paling tepat?",stimulusType:"webgis",spatialMode:"analogy",answers:[{id:"A",label:"Pilihan A"},{id:"B",label:"Pilihan B"},{id:"C",label:"Pilihan C"},{id:"D",label:"Pilihan D"},{id:"E",label:"Pilihan E"}],correctAnswer:"A",explanation:"Penjelasan jawaban benar.",mapExperience:"analysis",gisTools:["compare"],toolParameters:{}}]};

export default async function QuestionImportPage(){
  await requireTeacherSession();
  return <main style={{maxWidth:980,margin:"0 auto",padding:"32px 24px 64px"}}>
    <nav aria-label="Breadcrumb"><Link href="/teacher/questions">Bank Soal</Link> / <strong>Impor JSON</strong></nav>
    <header><p style={{color:"#167153",fontWeight:800}}>BATCH QUESTION IMPORT V3</p><h1>Impor soal dan Kelompok Spatial Thinking</h1><p>Format V3 membuat kelompok berdasarkan indikator Spatial Thinking. Stimulus tetap dimiliki masing-masing soal dan dapat berbeda di dalam kelompok yang sama. Semua QuestionVersion tetap dibuat sebagai DRAFT.</p></header>
    <QuestionBatchImport/>
    <section className={styles.guide}><h2>Format V3</h2><p>Definisikan <code>questionGroups</code> dengan <code>key</code> dan <code>spatialMode</code>, lalu gunakan <code>groupKey</code> pada soal. <code>spatialMode</code> soal harus sama dengan kelompoknya, tetapi <code>stimulusType</code> bebas per soal. Format V1 dan V2 lama tetap didukung untuk kompatibilitas.</p><pre>{JSON.stringify(example,null,2)}</pre></section>
  </main>;
}
