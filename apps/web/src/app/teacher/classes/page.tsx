import Link from "next/link";
import { listClasses } from "@/server/classes/service";
import { requireTeacherSession } from "@/server/auth/session";

export default async function ClassesPage({searchParams}:{searchParams:Promise<{status?:string}>}) {
  const session=await requireTeacherSession();
  const classes=await listClasses(session);
  const {status}=await searchParams;

  return (
    <main className="dashboard catalog-page">
      <header className="catalog-header">
        <div><p className="eyebrow">Class Management</p><h1>Kelas</h1><p>Data kelas di halaman ini sudah dibaca langsung dari PostgreSQL.</p></div>
      </header>

      {status==="error"&&<p className="account-alert error">Kelas gagal dibuat. Periksa data dan hak akses.</p>}

      <details className="class-create-panel">
        <summary>+ Buat Kelas</summary>
        <form action="/api/classes" method="post" className="class-create-form">
          <label>Nama kelas<input name="name" required maxLength={160} placeholder="XI-A Geografi"/></label>
          <label>Tingkat<input name="gradeLevel" maxLength={40} placeholder="XI"/></label>
          <label>Tahun ajaran<input name="academicYear" maxLength={40} placeholder="2026/2027"/></label>
          <label>Semester<input name="semester" maxLength={30} placeholder="1"/></label>
          <button className="button" type="submit">Buat Kelas & Generate Code</button>
        </form>
      </details>

      <section className="class-grid">
        {classes.map((item)=>(
          <article className="class-card" key={item.id}>
            <div className="class-card-top"><span className="grade-badge">{item.gradeLevel??"Kelas"}</span><span className="status-dot-label"><i /> {item.status}</span></div>
            <h2>{item.name}</h2>
            <p>{item.teacherName}</p>
            <div className="class-metrics"><div><strong>{item.studentCount}</strong><small>Siswa aktif</small></div><div><strong>{item.academicYear??"-"}</strong><small>Tahun ajaran</small></div></div>
            <div className="class-code"><span>Class Code</span><strong>{item.classCode}</strong></div>
            <Link className="button button-secondary button-wide" href={"/teacher/classes/"+item.id}>Buka Kelas</Link>
          </article>
        ))}
      </section>

      {!classes.length&&<div className="empty-state"><strong>Belum ada kelas.</strong><p>Buat kelas pertama untuk mulai menambahkan siswa dan enrollment.</p></div>}
    </main>
  );
}
