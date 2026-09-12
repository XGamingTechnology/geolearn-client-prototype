const skills=[
  ["Location","78%"],["Condition","72%"],["Influence","84%"],["Region","69%"],
  ["Hierarchy","74%"],["Analogy","66%"],["Pattern","81%"],["Association","76%"]
];
export default function ResultsPage(){
  return (
    <main className="dashboard catalog-page">
      <header className="catalog-header"><div><p className="eyebrow">Spatial Analytics</p><h1>Hasil</h1><p>Ringkasan completion, akurasi, waktu, aktivitas GIS, dan profil Spatial Thinking kelas.</p></div><button className="button" type="button" disabled>Pilih Penugasan</button></header>
      <section className="analytics-grid">
        <article className="analytics-card"><small>Completion</small><strong>82%</strong></article>
        <article className="analytics-card"><small>Class Average</small><strong>76.4</strong></article>
        <article className="analytics-card"><small>Accuracy</small><strong>74%</strong></article>
        <article className="analytics-card"><small>Median Time</small><strong>08:42</strong></article>
      </section>
      <section className="dashboard-panel">
        <div className="panel-heading"><div><p className="eyebrow">Spatial Thinking Profile</p><h2>Profil kelas XI-A</h2></div><span className="status-pill">PREVIEW</span></div>
        <div className="skill-grid">
          {skills.map(([name,value])=><article className="skill-card" key={name}><span>{name}</span><strong>{value}</strong><div className="skill-bar"><i style={{width:value}} /></div></article>)}
        </div>
      </section>
      <p className="preview-banner">Angka pada analytics ini adalah UI preview dan bukan hasil siswa nyata.</p>
    </main>
  );
}
