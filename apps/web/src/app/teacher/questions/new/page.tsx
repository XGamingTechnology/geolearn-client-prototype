import Link from "next/link";

const modes=["location","condition","influence","region","hierarchy","analogy","pattern","association"];
const stimuli=["text","image","video","static-map","webgis","dual-map","map-table","map-chart","composite"];

export default async function NewQuestionPage({searchParams}:{searchParams:Promise<{status?:string}>}){
  const {status}=await searchParams;
  return (
    <main className="dashboard builder-page">
      <header className="catalog-header"><div><p className="eyebrow">Question Builder</p><h1>Buat Soal Baru</h1><p>Draft tersimpan ke PostgreSQL dan dapat dipublish menjadi version immutable.</p></div><span className="status-pill">DATABASE</span></header>
      {status==="error"&&<p className="account-alert error">Draft gagal dibuat. Periksa field dan hak scope.</p>}
      <form action="/api/content/questions" method="post" className="real-question-form">
        <section className="dashboard-panel">
          <p className="eyebrow">1 · Information</p><div className="builder-two-col">
            <label>Judul<input name="title" required maxLength={220}/></label>
            <label>Scope<select name="scope" defaultValue="PRIVATE"><option value="PRIVATE">My Bank</option><option value="SCHOOL">School Bank</option></select></label>
          </div>
          <div className="builder-two-col"><label>Subject<input name="subject" defaultValue="Geografi"/></label><label>Topik<input name="topic"/></label></div>
          <div className="builder-two-col"><label>Spatial Thinking<select name="spatialMode" defaultValue="influence">{modes.map((m)=><option key={m}>{m}</option>)}</select></label><label>Difficulty<input name="difficulty" defaultValue="Sedang"/></label></div>
        </section>
        <section className="dashboard-panel"><p className="eyebrow">2 · Stimulus</p><label>Stimulus Type<select name="stimulusType" defaultValue="text">{stimuli.map((x)=><option value={x} key={x}>{x}</option>)}</select></label><small className="form-note">Image/video tidak membutuhkan konfigurasi GIS. WebGIS dapat dilengkapi pada Slice Data/GIS.</small></section>
        <section className="dashboard-panel"><p className="eyebrow">3 · Prompt & Response A–E</p><label>Prompt<textarea name="prompt" required rows={5}/></label><div className="answer-form-grid">{["A","B","C","D","E"].map((id)=><label key={id}>{id}<input name={"answer_"+id} required/></label>)}</div><label>Kunci<select name="correctAnswer" defaultValue="A">{["A","B","C","D","E"].map((id)=><option key={id}>{id}</option>)}</select></label></section>
        <section className="dashboard-panel"><p className="eyebrow">4 · Feedback</p><label>Benar<textarea name="feedbackCorrect" rows={3}/></label><label>Belum tepat<textarea name="feedbackIncorrect" rows={3}/></label></section>
        <div className="builder-footer"><Link className="button button-secondary" href="/teacher/questions">← Bank Soal</Link><button className="button" type="submit">Simpan Draft</button></div>
      </form>
    </main>
  );
}
