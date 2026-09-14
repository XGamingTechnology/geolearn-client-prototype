import Link from "next/link";

const questions = [
  { title: "Pengaruh Sungai terhadap Akses Sekolah", mode: "Influence", stimulus: "WebGIS", response: "A–E", difficulty: "Sedang", scope: "School", version: "v1", status: "Published" },
  { title: "Pola Permukiman di Wilayah Pesisir", mode: "Pattern", stimulus: "Static Map", response: "A–E", difficulty: "Sedang", scope: "My", version: "v3", status: "Draft" },
  { title: "Banjir Rob Semarang–Demak", mode: "Association", stimulus: "Composite", response: "Multi-select", difficulty: "Sulit", scope: "School", version: "v2", status: "Published" },
  { title: "Lokasi Monas pada Sistem Koordinat", mode: "Location", stimulus: "WebGIS", response: "A–E", difficulty: "Mudah", scope: "System", version: "v1", status: "Published" },
];

export default function QuestionsPage() {
  return (
    <main className="dashboard catalog-page">
      <header className="catalog-header">
        <div><p className="eyebrow">Content Bank</p><h1>Bank Soal</h1><p>Temukan dan gunakan soal reusable berdasarkan Spatial Thinking, stimulus, response, scope, dan versi.</p></div>
        <Link className="button" href="/teacher/questions/new">+ Soal Baru</Link>
      </header>
      <div className="scope-tabs" aria-label="Scope Bank Soal"><span className="active">Semua</span><span>System Bank</span><span>School Bank</span><span>My Bank</span></div>
      <div className="catalog-toolbar">
        <div className="search-box">⌕ <input aria-label="Cari soal" placeholder="Cari judul soal..." readOnly /></div>
        <div className="filter-chips"><span>Mode</span><span>Stimulus</span><span>Response</span><span>Kesulitan</span><span>Status</span></div>
      </div>
      <section className="question-bank-list">
        {questions.map((q) => (
          <article className="question-bank-row" key={q.title}>
            <div className="question-thumb">{q.stimulus === "WebGIS" ? "◎" : q.stimulus === "Composite" ? "◫" : "▣"}</div>
            <div className="question-main"><div className="question-tags"><span>{q.mode}</span><span>{q.stimulus}</span><span>{q.response}</span></div><h2>{q.title}</h2><p>{q.difficulty} · {q.scope} · {q.version}</p></div>
            <div className="question-status"><span className={q.status === "Published" ? "publish" : "draft"}>{q.status}</span></div>
            <div className="row-actions"><button type="button" disabled>Preview</button><button type="button" disabled>Use</button><button type="button" disabled>Duplicate</button></div>
          </article>
        ))}
      </section>
      <p className="preview-banner">Question Bank ini masih UI preview. Versioning dan authoring real akan dihubungkan pada Slice Content Authoring.</p>
    </main>
  );
}
