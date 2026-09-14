import Link from "next/link";
import { notFound } from "next/navigation";

const sections = {
  classes: { title: "Kelas", eyebrow: "Class Management", description: "Kelola kelas, kode kelas, siswa, enrollment, dan penugasan dari satu tempat.", action: "+ Buat Kelas", icon: "▦" },
  questions: { title: "Bank Soal", eyebrow: "Content Bank", description: "Cari, filter, gunakan, dan duplikasi soal berdasarkan Spatial Thinking, stimulus, respons, dan scope.", action: "+ Soal Baru", icon: "?" },
  assignments: { title: "Penugasan", eyebrow: "Assessment", description: "Atur quiz version, kelas tujuan, jadwal, serta status pengerjaan siswa.", action: "+ Buat Tugas", icon: "✓" },
  data: { title: "Bank Data", eyebrow: "Spatial Data Catalog", description: "Kelola dataset vector, raster, dan tabel untuk Case, Question, dan GIS Studio.", action: "Upload Data", icon: "◫" },
  media: { title: "Media", eyebrow: "Media Bank", description: "Kelola image, video, dokumen, chart, dan ilustrasi secara terpisah dari data spasial.", action: "Upload Media", icon: "▣" },
  gis: { title: "GIS Studio", eyebrow: "Spatial Workspace", description: "Susun layer, atur style, digitasi, Buffer, Overlay, dan siapkan Student Preview.", action: "+ Project Baru", icon: "◎" },
  results: { title: "Hasil", eyebrow: "Spatial Analytics", description: "Lihat completion, akurasi, waktu, aktivitas GIS, dan profil delapan mode Spatial Thinking.", action: "Pilih Penugasan", icon: "◔" },
} as const;

export default async function TeacherSection({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!(section in sections)) notFound();
  const item = sections[section as keyof typeof sections];

  return (
    <main className="dashboard">
      <header className="dashboard-welcome compact">
        <div><p className="eyebrow">{item.eyebrow}</p><h1>{item.title}</h1><p>{item.description}</p></div>
        <button className="button" type="button" disabled title="Backend modul akan dihubungkan pada slice terkait">{item.action}</button>
      </header>
      <section className="module-placeholder">
        <div className="placeholder-icon">{item.icon}</div>
        <span className="status-pill">UI V3 FOUNDATION</span>
        <h2>{item.title} siap menjadi workspace real.</h2>
        <p>Struktur navigasi dan visual sudah mengikuti UI System V3. Data dan aksi backend akan dihubungkan pada vertical slice modul ini.</p>
        <div className="placeholder-actions">
          <Link className="button button-secondary" href="/teacher">Kembali ke Dashboard</Link>
          {section === "gis" && <Link className="button" href="/learn/demo">Buka Runtime Demo</Link>}
        </div>
      </section>
    </main>
  );
}
