import Link from "next/link";
import { notFound } from "next/navigation";
import { StudentManagerControls } from "@/components/student-manager-controls";
import { assertClassAccess, listEnrolledStudents } from "@/server/classes/service";
import { requireTeacherSession } from "@/server/auth/session";

export default async function ClassDetailPage({params,searchParams}:{params:Promise<{classId:string}>;searchParams:Promise<{status?:string}>}) {
  const session=await requireTeacherSession();
  const {classId}=await params;
  let item;
  try{item=await assertClassAccess(session,classId);}catch{return notFound();}
  const students=await listEnrolledStudents(session,classId);
  const {status}=await searchParams;

  return (
    <main className="dashboard class-detail-page">
      <div className="breadcrumb"><Link href="/teacher/classes">Kelas</Link><span>/</span><strong>{item.name}</strong></div>
      {status==="updated"&&<p className="account-alert">Data kelas berhasil diperbarui.</p>}
      {status==="error"&&<p className="account-alert error">Perubahan kelas gagal.</p>}

      <header className="class-detail-hero">
        <div>
          <div className="class-detail-badges"><span>{item.gradeLevel??"Kelas"}</span><span>{item.academicYear??"-"}</span><span>Semester {item.semester??"-"}</span></div>
          <h1>{item.name}</h1>
          <p>{item.teacherName} · data kelas dan enrollment real.</p>
        </div>
        <span className="status-pill">{item.status}</span>
      </header>

      <section className="class-overview-grid">
        <article><small>Class Code</small><strong>{item.classCode}</strong><span>Gunakan untuk login siswa</span></article>
        <article><small>Jumlah Siswa</small><strong>{item.studentCount}</strong><span>enrollment aktif</span></article>
        <article><small>Teacher</small><strong>{item.teacherName}</strong><span>owner kelas</span></article>
        <article><small>Status</small><strong>{item.status}</strong><span>PostgreSQL</span></article>
      </section>

      <details className="class-edit-panel">
        <summary>Edit Kelas</summary>
        <form action={"/api/classes/"+item.id} method="post" className="class-create-form">
          <label>Nama<input name="name" defaultValue={item.name} required/></label>
          <label>Tingkat<input name="gradeLevel" defaultValue={item.gradeLevel??""}/></label>
          <label>Tahun ajaran<input name="academicYear" defaultValue={item.academicYear??""}/></label>
          <label>Semester<input name="semester" defaultValue={item.semester??""}/></label>
          <label>Status<select name="status" defaultValue={item.status}><option value="ACTIVE">Active</option><option value="DISABLED">Disabled</option><option value="ARCHIVED">Archived</option></select></label>
          <button className="button" type="submit">Simpan</button>
        </form>
      </details>

      <section className="student-manager-panel">
        <div className="student-manager-toolbar"><div><p className="eyebrow">Student Manager</p><h2>Daftar siswa</h2></div><span className="status-pill">DATABASE</span></div>
        <StudentManagerControls classId={item.id} students={students.map((s)=>({...s,lastLoginAt:s.lastLoginAt?.toISOString()??null}))}/>
      </section>
    </main>
  );
}
