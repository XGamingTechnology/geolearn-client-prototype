import Link from "next/link";

const assignments = [
  { title:"Pengaruh Sungai terhadap Akses Sekolah", className:"XI-A Geografi", mode:"Influence", type:"WebGIS", completion:"24/32", due:"18 Sep 2026", status:"Aktif" },
  { title:"Pola Permukiman Wilayah Pesisir", className:"XI-B Geografi", mode:"Pattern", type:"Static Map", completion:"29/31", due:"20 Sep 2026", status:"Aktif" },
  { title:"Banjir Rob Semarang–Demak", className:"XII-A Geografi", mode:"Association", type:"Composite", completion:"17/30", due:"21 Sep 2026", status:"Aktif" },
  { title:"Zona Bahaya Gunung Merapi", className:"X-1 Geografi", mode:"Region", type:"WebGIS", completion:"35/35", due:"10 Sep 2026", status:"Selesai" },
];

export default function AssignmentsPage(){
  return (
    <main className="dashboard catalog-page">
      <header className="catalog-header">
        <div><p className="eyebrow">Assessment Management</p><h1>Penugasan</h1><p>Atur quiz version, kelas tujuan, jadwal, dan pantau pengerjaan siswa.</p></div>
        <button className="button" type="button" disabled>+ Buat Tugas</button>
      </header>

      <section className="assignment-summary-grid">
        <article><small>Aktif</small><strong>3</strong><span>assignment berjalan</span></article>
        <article><small>Selesai</small><strong>1</strong><span>preview history</span></article>
        <article><small>Completion</small><strong>82%</strong><span>rata-rata UI preview</span></article>
        <article><small>Due minggu ini</small><strong>3</strong><span>butuh perhatian</span></article>
      </section>

      <div className="scope-tabs"><span className="active">Semua</span><span>Aktif</span><span>Selesai</span><span>Draft</span></div>
      <div className="catalog-toolbar">
        <div className="search-box">⌕ <input aria-label="Cari penugasan" placeholder="Cari tugas..." readOnly /></div>
        <div className="filter-chips"><span>Kelas</span><span>Mode</span><span>Deadline</span></div>
      </div>

      <section className="assignment-management-list">
        {assignments.map((item)=>(
          <article className="assignment-management-row" key={item.title}>
            <div className="assignment-type-icon">{item.type==="WebGIS"?"◎":item.type==="Composite"?"◫":"▣"}</div>
            <div className="assignment-management-main">
              <div className="question-tags"><span>{item.className}</span><span>{item.mode}</span><span>{item.type}</span></div>
              <h2>{item.title}</h2>
              <p>Deadline {item.due}</p>
            </div>
            <div className="assignment-progress-cell"><strong>{item.completion}</strong><small>selesai</small><div><i style={{width:item.status==="Selesai"?"100%":"78%"}} /></div></div>
            <span className={item.status==="Aktif"?"assignment-status active":"assignment-status complete"}>{item.status}</span>
            <div className="row-actions"><Link href="/teacher/results">Hasil</Link><Link href="/student/assessment/demo">Preview</Link></div>
          </article>
        ))}
      </section>

      <p className="preview-banner">Penugasan pada layar ini masih UI preview. Assignment real harus mereferensikan QuizVersion immutable.</p>
    </main>
  );
}
