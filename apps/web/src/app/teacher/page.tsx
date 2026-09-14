import Link from "next/link";

const stats = [
  ["▦", "Kelas Aktif", "4", "Tahun ajaran 2026/2027"],
  ["♙", "Siswa", "128", "Across preview classes"],
  ["✓", "Tugas Aktif", "6", "3 deadline minggu ini"],
  ["?", "Bank Soal", "50", "Draft instrumen spatial thinking"],
  ["◫", "Bank Data", "12", "Vector & raster preview"],
];

export default function TeacherDashboard() {
  return (
    <main className="dashboard">
      <header className="dashboard-welcome">
        <div>
          <p className="eyebrow">Teacher Dashboard · Staging</p>
          <h1>Selamat datang, Bu Guru.</h1>
          <p>Pantau kelas dan siapkan pengalaman belajar spasial dari satu ruang kerja.</p>
        </div>
        <div className="dashboard-actions">
          <Link className="button button-secondary" href="/teacher/questions">+ Soal Baru</Link>
          <button className="button" type="button" disabled title="Aktif setelah assignment backend tersedia">+ Buat Tugas</button>
        </div>
      </header>

      <section className="metric-grid" aria-label="Ringkasan ruang guru">
        {stats.map(([icon, label, value, note]) => (
          <article className="metric-card" key={label}>
            <span className="metric-icon">{icon}</span>
            <div><small>{label}</small><strong>{value}</strong><p>{note}</p></div>
          </article>
        ))}
      </section>

      <section className="dashboard-content-grid">
        <article className="dashboard-panel assignment-panel">
          <div className="panel-heading"><div><p className="eyebrow">Monitoring</p><h2>Tugas aktif</h2></div><Link href="/teacher/assignments">Lihat semua →</Link></div>
          <div className="assignment-list">
            <div className="assignment-row"><span className="assignment-state active" /><div><strong>XI-A · Pengaruh Sungai</strong><small>WebGIS · Buffer · Influence</small></div><div className="row-stat"><strong>24/32</strong><small>selesai</small></div></div>
            <div className="assignment-row"><span className="assignment-state" /><div><strong>XI-B · Pola Permukiman</strong><small>Static Map · Pattern</small></div><div className="row-stat"><strong>29/31</strong><small>selesai</small></div></div>
            <div className="assignment-row"><span className="assignment-state warning" /><div><strong>XII-A · Banjir Rob Demak</strong><small>Composite · Association</small></div><div className="row-stat"><strong>17/30</strong><small>selesai</small></div></div>
          </div>
          <p className="mock-data-note">Data dashboard saat ini adalah UI preview dan belum berasal dari database siswa.</p>
        </article>

        <aside className="dashboard-panel quick-panel">
          <div><p className="eyebrow">Quick Actions</p><h2>Mulai membuat</h2><p>Masuk langsung ke alur kerja yang paling sering dipakai guru.</p></div>
          <div className="quick-action-grid">
            <Link href="/teacher/questions"><span>?</span><strong>Soal Baru</strong><small>Builder 8 langkah</small></Link>
            <Link href="/teacher/data"><span>◫</span><strong>Upload Data</strong><small>Vector / raster</small></Link>
            <Link href="/teacher/gis"><span>◎</span><strong>GIS Studio</strong><small>Layer & analisis</small></Link>
            <Link href="/learn/demo"><span>▶</span><strong>Student Preview</strong><small>Coba runtime</small></Link>
          </div>
        </aside>
      </section>

      <section className="dashboard-panel recent-panel">
        <div className="panel-heading"><div><p className="eyebrow">Workspace</p><h2>Modul GeoLearn</h2></div><span className="status-pill">UI PREVIEW</span></div>
        <div className="module-grid">
          <Link href="/teacher/classes"><span>▦</span><div><strong>Kelas & Siswa</strong><small>Class code, roster, enrollment</small></div></Link>
          <Link href="/teacher/questions"><span>?</span><div><strong>Bank Soal</strong><small>System, School, My Bank</small></div></Link>
          <Link href="/teacher/cases"><span>◇</span><div><strong>Case Library</strong><small>Media + data + related questions</small></div></Link>
          <Link href="/teacher/data"><span>◫</span><div><strong>Bank Data</strong><small>Dataset spatial reusable</small></div></Link>
          <Link href="/teacher/media"><span>▣</span><div><strong>Media</strong><small>Image, video, document</small></div></Link>
          <Link href="/teacher/gis"><span>◎</span><div><strong>GIS Studio</strong><small>Layer, digitize, analyze</small></div></Link>
          <Link href="/teacher/results"><span>◔</span><div><strong>Hasil</strong><small>Spatial Thinking analytics</small></div></Link>
        </div>
      </section>
    </main>
  );
}
