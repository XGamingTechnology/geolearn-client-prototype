import Link from "next/link";
import { requireTeacherSession } from "@/server/auth/session";

const modes=[["location","Spatial Location"],["condition","Spatial Condition"],["influence","Spatial Influence"],["region","Spatial Region"],["hierarchy","Spatial Hierarchy"],["analogy","Spatial Analogies"],["pattern","Spatial Pattern"],["association","Spatial Association"]] as const;

export default async function NewQuestionGroupPage({searchParams}:{searchParams:Promise<{status?:string;message?:string}>}){
  await requireTeacherSession();
  const {status,message}=await searchParams;
  return <main className="dashboard catalog-page">
    <header className="catalog-header"><div><p className="eyebrow">Question Library</p><h1>Buat Kelompok Spatial Thinking</h1><p>Kelompok soal berdasarkan indikator Spatial Thinking. Setiap soal tetap bebas menggunakan stimulus Text, Image, Video, atau WebGIS yang berbeda.</p></div><Link className="button button-secondary" href="/teacher/questions/groups">← Kelompok Spatial Thinking</Link></header>
    {status==="error"&&<p className="account-alert error">{message||"Kelompok Spatial Thinking gagal dibuat."}</p>}
    <section className="dashboard-panel">
      <form className="assessment-create-form" action="/api/content/question-groups" method="post">
        <div className="builder-two-col"><label>Judul Kelompok<input name="title" required maxLength={220} placeholder="Spatial Analogies"/></label><label>Scope<select name="scope" defaultValue="PRIVATE"><option value="PRIVATE">My Bank</option><option value="SCHOOL">School Bank</option></select></label></div>
        <div className="builder-two-col"><label>Subject<input name="subject" defaultValue="Geografi"/></label><label>Topik<input name="topic" placeholder="Spatial Analogies"/></label></div>
        <label>Deskripsi<textarea name="description" rows={3} placeholder="Kumpulan soal untuk indikator Spatial Thinking ini…"/></label>
        <fieldset className="decision-grid"><legend>Indikator Spatial Thinking</legend>{modes.map(([value,label])=><label className="decision-card" key={value}><input type="radio" name="spatialMode" value={value} defaultChecked={value==="location"}/><strong>{label}</strong></label>)}</fieldset>
        <p className="form-note">Setelah dibuat, Question Builder otomatis memilih indikator ini. Stimulus tetap ditentukan pada masing-masing soal.</p>
        <button className="button" type="submit">Buat Kelompok & Tambah Soal</button>
      </form>
    </section>
  </main>;
}
