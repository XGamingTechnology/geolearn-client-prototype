const classes = [
  { name: "XI-A Geografi", grade: "XI", students: 32, assignments: 2, code: "GL-XIA-7K3Q", teacher: "Guru Geografi" },
  { name: "XI-B Geografi", grade: "XI", students: 31, assignments: 1, code: "GL-XIB-4M8P", teacher: "Guru Geografi" },
  { name: "XII-A Geografi", grade: "XII", students: 30, assignments: 2, code: "GL-XIIA-9D2K", teacher: "Guru Geografi" },
  { name: "X-1 Geografi", grade: "X", students: 35, assignments: 1, code: "GL-X1-6R5T", teacher: "Guru Geografi" },
];

export default function ClassesPage() {
  return (
    <main className="dashboard catalog-page">
      <header className="catalog-header">
        <div><p className="eyebrow">Class Management</p><h1>Kelas</h1><p>Kelola kelas, kode akses, siswa, dan penugasan dalam satu workspace.</p></div>
        <button className="button" type="button" disabled>+ Buat Kelas</button>
      </header>
      <div className="catalog-toolbar">
        <div className="search-box">⌕ <input aria-label="Cari kelas" placeholder="Cari kelas..." readOnly /></div>
        <div className="filter-chips"><span className="active">2026/2027</span><span>Semester 1</span><span>Semua tingkat</span></div>
      </div>
      <section className="class-grid">
        {classes.map((item) => (
          <article className="class-card" key={item.code}>
            <div className="class-card-top"><span className="grade-badge">{item.grade}</span><span className="status-dot-label"><i /> Aktif</span></div>
            <h2>{item.name}</h2>
            <p>{item.teacher}</p>
            <div className="class-metrics"><div><strong>{item.students}</strong><small>Siswa</small></div><div><strong>{item.assignments}</strong><small>Tugas aktif</small></div></div>
            <div className="class-code"><span>Class Code</span><strong>{item.code}</strong><button type="button" disabled>Salin</button></div>
            <button className="button button-secondary button-wide" type="button" disabled>Buka Kelas</button>
          </article>
        ))}
      </section>
      <p className="preview-banner">Data kelas masih UI preview. CRUD, enrollment, dan kredensial siswa akan aktif pada Slice Classes & Students.</p>
    </main>
  );
}
