import Link from "next/link";
import { notFound } from "next/navigation";

const classMap = {
  "xi-a": { name: "XI-A Geografi", grade: "XI", code: "GL-XIA-7K3Q", students: 32 },
  "xi-b": { name: "XI-B Geografi", grade: "XI", code: "GL-XIB-4M8P", students: 31 },
  "xii-a": { name: "XII-A Geografi", grade: "XII", code: "GL-XIIA-9D2K", students: 30 },
  "x-1": { name: "X-1 Geografi", grade: "X", code: "GL-X1-6R5T", students: 35 },
} as const;

const students = [
  ["GL-11A-001","Alya Prameswari","Aktif","Hari ini"],
  ["GL-11A-002","Bima Aditya","Aktif","Kemarin"],
  ["GL-11A-003","Citra Maharani","Aktif","2 hari lalu"],
  ["GL-11A-004","Daffa Ramadhan","Reset PIN","5 hari lalu"],
  ["GL-11A-005","Eka Safitri","Aktif","Hari ini"],
];

export default async function ClassDetailPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  const item = classMap[classId as keyof typeof classMap];
  if (!item) notFound();

  return (
    <main className="dashboard class-detail-page">
      <div className="breadcrumb"><Link href="/teacher/classes">Kelas</Link><span>/</span><strong>{item.name}</strong></div>

      <header className="class-detail-hero">
        <div>
          <div className="class-detail-badges"><span>{item.grade}</span><span>2026/2027</span><span>Semester 1</span></div>
          <h1>{item.name}</h1>
          <p>Kelola enrollment, kredensial siswa, penugasan, dan hasil belajar kelas.</p>
        </div>
        <div className="class-detail-actions"><button className="button button-secondary" type="button" disabled>+ Tambah Siswa</button><button className="button" type="button" disabled>+ Buat Tugas</button></div>
      </header>

      <section className="class-overview-grid">
        <article><small>Class Code</small><strong>{item.code}</strong><button type="button" disabled>Salin kode</button></article>
        <article><small>Jumlah Siswa</small><strong>{item.students}</strong><span>enrollment aktif</span></article>
        <article><small>Tugas Aktif</small><strong>2</strong><span>1 deadline minggu ini</span></article>
        <article><small>Completion</small><strong>82%</strong><span>UI preview</span></article>
      </section>

      <div className="detail-tabs"><span>Penugasan</span><span className="active">Siswa</span><span>Hasil</span></div>

      <section className="student-manager-panel">
        <div className="student-manager-toolbar">
          <div><p className="eyebrow">Student Manager</p><h2>Daftar siswa</h2></div>
          <div className="student-manager-actions"><div className="search-box">⌕ <input placeholder="Cari siswa..." readOnly /></div><button type="button" disabled>Import CSV</button><button type="button" disabled>Export Credentials</button></div>
        </div>

        <div className="student-table" role="table" aria-label="Daftar siswa preview">
          <div className="student-table-head" role="row"><span>Student ID</span><span>Nama</span><span>Status</span><span>Aktivitas</span><span>Aksi</span></div>
          {students.map(([id,name,status,last]) => (
            <div className="student-table-row" role="row" key={id}>
              <span className="student-id">{id}</span>
              <strong>{name}</strong>
              <span><i className={status==="Aktif"?"status-mini active":"status-mini warning"} />{status}</span>
              <span>{last}</span>
              <span className="student-row-actions"><button type="button" disabled>Reset PIN</button><button type="button" disabled>•••</button></span>
            </div>
          ))}
        </div>

        <div className="mobile-student-list">
          {students.map(([id,name,status,last]) => (
            <article className="mobile-student-card" key={id}>
              <div><strong>{name}</strong><span>{id}</span></div>
              <div><span><i className={status==="Aktif"?"status-mini active":"status-mini warning"} />{status}</span><small>{last}</small></div>
              <button type="button" disabled>Kelola</button>
            </article>
          ))}
        </div>
      </section>

      <p className="preview-banner">Student Manager masih UI preview. PIN tidak ditampilkan dan belum ada kredensial nyata.</p>
    </main>
  );
}
