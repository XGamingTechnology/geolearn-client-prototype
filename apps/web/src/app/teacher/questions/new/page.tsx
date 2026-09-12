import Link from "next/link";

const steps=["Information","Stimulus","Data & GIS","Activity","Response","Validation","Feedback","Student Preview"];

export default function QuestionBuilderPage(){
  return (
    <main className="dashboard builder-page">
      <header className="catalog-header">
        <div><p className="eyebrow">Question Builder</p><h1>Buat Soal Baru</h1><p>Wizard 8 langkah untuk stimulus multimodal, aktivitas GIS, response, validation, dan feedback.</p></div>
        <span className="status-pill">DRAFT PREVIEW</span>
      </header>
      <section className="builder-layout">
        <aside className="builder-steps" aria-label="Langkah Question Builder">
          {steps.map((step,index)=><div className={"builder-step "+(index===0?"active":"")} key={step}><b>{index+1}</b><span>{step}</span></div>)}
        </aside>
        <article className="builder-editor">
          <h2>1. Information</h2>
          <p>Tentukan identitas dasar soal sebelum menambahkan stimulus atau konfigurasi GIS.</p>
          <div className="builder-form">
            <label>Judul Soal<input value="Pengaruh Sungai terhadap Akses Sekolah" readOnly /></label>
            <div className="builder-two-col">
              <label>Spatial Thinking Mode<select defaultValue="Influence" disabled><option>Influence</option></select></label>
              <label>Tingkat<select defaultValue="XI" disabled><option>XI</option></select></label>
            </div>
            <div className="builder-two-col">
              <label>Topik<input value="Aksesibilitas & wilayah pengaruh" readOnly /></label>
              <label>Difficulty<select defaultValue="Sedang" disabled><option>Sedang</option></select></label>
            </div>
            <label>Prompt<textarea value="Gunakan Buffer pada Sungai Siak untuk mengamati wilayah pengaruh dan tentukan pernyataan yang paling tepat." readOnly /></label>
          </div>
          <div className="builder-footer"><Link className="button button-secondary" href="/teacher/questions">← Bank Soal</Link><span className="builder-save-state">Saved · UI preview</span><button className="button" type="button" disabled>Berikutnya →</button></div>
        </article>
      </section>
    </main>
  );
}
