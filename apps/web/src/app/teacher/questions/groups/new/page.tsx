import Link from "next/link";
import { requireTeacherSession } from "@/server/auth/session";

export default async function NewQuestionGroupPage({searchParams}:{searchParams:Promise<{status?:string;message?:string}>}){
  await requireTeacherSession();
  const {status,message}=await searchParams;
  return <main className="dashboard catalog-page">
    <header className="catalog-header"><div><p className="eyebrow">Question Library</p><h1>Buat Stimulus Set</h1><p>Satu stimulus dapat dipakai sebagai konteks authoring untuk beberapa soal. Setiap QuestionVersion tetap menyimpan snapshot stimulusnya sendiri saat dipublish.</p></div><Link className="button button-secondary" href="/teacher/questions/groups">← Stimulus Set</Link></header>
    {status==="error"&&<p className="account-alert error">{message||"Stimulus Set gagal dibuat."}</p>}
    <section className="dashboard-panel">
      <form className="assessment-create-form" action="/api/content/question-groups" method="post">
        <div className="builder-two-col"><label>Judul Stimulus Set<input name="title" required maxLength={220} placeholder="Banjir Sungai Siak"/></label><label>Scope<select name="scope" defaultValue="PRIVATE"><option value="PRIVATE">My Bank</option><option value="SCHOOL">School Bank</option></select></label></div>
        <div className="builder-two-col"><label>Subject<input name="subject" defaultValue="Geografi"/></label><label>Topik<input name="topic" placeholder="Banjir perkotaan"/></label></div>
        <label>Deskripsi<textarea name="description" rows={3} placeholder="Konteks bersama untuk beberapa soal…"/></label>
        <fieldset className="decision-grid"><legend>Tipe Stimulus</legend>{[["text","Text"],["image","Image"],["video","Video"],["webgis","WebGIS"]].map(([value,label])=><label className="decision-card" key={value}><input type="radio" name="stimulusType" value={value} defaultChecked={value==="webgis"}/><strong>{label}</strong></label>)}</fieldset>
        <p className="form-note">Setelah dibuat, Anda langsung diarahkan ke Question Builder untuk membuat soal pertama di dalam Stimulus Set ini.</p>
        <button className="button" type="submit">Buat Set & Tambah Soal</button>
      </form>
    </section>
  </main>;
}
