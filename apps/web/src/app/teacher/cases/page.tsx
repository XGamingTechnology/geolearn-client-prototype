import Link from "next/link";

const cases = [
  { id:"banjir-rob-semarang-demak", title:"Banjir Rob Semarang–Demak", mode:"Association", stimulus:"Composite", datasets:3, media:2, questions:4, scope:"School", status:"Published" },
  { id:"akses-sekolah-pekanbaru", title:"Akses Sekolah Pekanbaru", mode:"Influence", stimulus:"WebGIS", datasets:3, media:1, questions:3, scope:"School", status:"Draft" },
  { id:"lereng-cisarua", title:"Kerawanan Lereng Cisarua", mode:"Condition", stimulus:"Map + Chart", datasets:3, media:1, questions:4, scope:"My", status:"Draft" },
  { id:"merapi-zona-bahaya", title:"Zona Bahaya Gunung Merapi", mode:"Region", stimulus:"WebGIS", datasets:2, media:2, questions:3, scope:"System", status:"Published" },
];

export default function CaseLibraryPage(){
  return (
    <main className="dashboard catalog-page">
      <header className="catalog-header">
        <div><p className="eyebrow">Reusable Spatial Content</p><h1>Case Library</h1><p>Gabungkan media, dataset, map state, dan beberapa pertanyaan menjadi satu konteks pembelajaran reusable.</p></div>
        <button className="button" type="button" disabled>+ Case Baru</button>
      </header>

      <div className="scope-tabs"><span className="active">Semua Case</span><span>System</span><span>School</span><span>My Case</span></div>
      <div className="catalog-toolbar">
        <div className="search-box">⌕ <input aria-label="Cari case" placeholder="Cari case..." readOnly /></div>
        <div className="filter-chips"><span>Spatial Mode</span><span>Stimulus</span><span>Status</span></div>
      </div>

      <section className="case-grid">
        {cases.map((item)=>(
          <article className="case-card" key={item.id}>
            <div className="case-preview">
              <div className="case-map-grid" />
              <span className="case-water-line" />
              <span className="case-area-shape" />
              <div className="case-preview-label"><strong>{item.stimulus}</strong><small>{item.mode}</small></div>
            </div>
            <div className="case-card-body">
              <div className="dataset-badges"><span>{item.scope}</span><span>{item.status}</span><span>v1</span></div>
              <h2>{item.title}</h2>
              <p>Case preview untuk authoring GeoLearn. Isi belum berasal dari content backend.</p>
              <div className="case-stats"><div><strong>{item.datasets}</strong><small>Dataset</small></div><div><strong>{item.media}</strong><small>Media</small></div><div><strong>{item.questions}</strong><small>Questions</small></div></div>
              <div className="dataset-actions"><Link href={"/teacher/cases/"+item.id}>Open Case</Link><button type="button" disabled>Use</button><button type="button" disabled>Duplicate</button></div>
            </div>
          </article>
        ))}
      </section>

      <p className="preview-banner">Case Library masih UI preview. Published CaseVersion nantinya immutable dan dapat direferensikan banyak QuestionVersion.</p>
    </main>
  );
}
