import Link from "next/link";
import {requireTeacherSession} from "@/server/auth/session";
import {QuestionBatchImport} from "@/components/question-batch-import";
import styles from "@/components/question-batch-import.module.css";

const example={version:2,scope:"PRIVATE",stimulusSets:[{key:"siak-map",title:"Sungai Siak dan Sekolah",description:"Stimulus peta bersama untuk analisis lokasi sekolah di sekitar Sungai Siak.",subject:"Geografi",topic:"Lokasi",stimulusType:"webgis"}],questions:[{groupKey:"siak-map",title:"Contoh lokasi",subject:"Geografi",topic:"Lokasi",difficulty:"Sedang",prompt:"Objek manakah yang berada di lokasi tersebut?",stimulusType:"webgis",spatialMode:"location",answers:[{id:"A",label:"Pilihan A"},{id:"B",label:"Pilihan B"},{id:"C",label:"Pilihan C"},{id:"D",label:"Pilihan D"},{id:"E",label:"Pilihan E"}],correctAnswer:"A",explanation:"Penjelasan jawaban benar.",feedbackIncorrect:"Tinjau kembali peta.",mapExperience:"analysis",gisTools:["buffer"],toolParameters:{buffer:{distanceMeters:500}}}]};

export default async function QuestionImportPage(){
  await requireTeacherSession();
  return <main style={{maxWidth:980,margin:"0 auto",padding:"32px 24px 64px"}}>
    <nav aria-label="Breadcrumb"><Link href="/teacher/questions">Bank Soal</Link> / <strong>Impor JSON</strong></nav>
    <header><p style={{color:"#167153",fontWeight:800}}>BATCH QUESTION IMPORT V2</p><h1>Impor banyak soal dan kelompok stimulus</h1><p>Format V2 dapat membuat Stimulus Set sekaligus menghubungkan soal ke kelompoknya. Semua QuestionVersion tetap dibuat sebagai DRAFT dan tidak dipublish otomatis.</p></header>
    <QuestionBatchImport/>
    <section className={styles.guide}><h2>Format V2</h2><p>Definisikan <code>stimulusSets</code> dengan <code>key</code> unik, lalu gunakan <code>groupKey</code> pada soal yang berbagi stimulus. Jenis stimulus dan scope soal harus sama dengan Stimulus Set. Format V1 lama tetap didukung. Dataset dan media aktual tetap dihubungkan setelah impor.</p><pre>{JSON.stringify(example,null,2)}</pre></section>
  </main>;
}
