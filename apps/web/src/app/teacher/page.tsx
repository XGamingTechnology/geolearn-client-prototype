import Link from "next/link";
import styles from "./dashboard.module.css";

type IconName = "class" | "student" | "assignment" | "question" | "case" | "data" | "gis" | "result" | "media" | "plus" | "arrow";

function Icon({ name }: { name: IconName }) {
  const common = { viewBox: "0 0 24 24", "aria-hidden": true } as const;
  if (name === "class") return <svg {...common}><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/></svg>;
  if (name === "student") return <svg {...common}><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20a5.5 5.5 0 0 1 11 0M13 16a4.5 4.5 0 0 1 8.5 2"/></svg>;
  if (name === "assignment") return <svg {...common}><path d="M9 4h6M9 2h6v4H9z"/><path d="M7 4H5v17h14V4h-2"/><path d="m8 12 2 2 5-5M8 18h8"/></svg>;
  if (name === "question") return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.1 1.9c-1.1.8-1.6 1.2-1.6 2.6M12 17h.01"/></svg>;
  if (name === "case") return <svg {...common}><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M8 5V3h8v2M3 10h18M9 14h6"/></svg>;
  if (name === "data") return <svg {...common}><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>;
  if (name === "gis") return <svg {...common}><path d="m3 6 5-3 8 3 5-3v15l-5 3-8-3-5 3V6Z"/><path d="M8 3v15M16 6v15"/></svg>;
  if (name === "result") return <svg {...common}><path d="M4 20V11M10 20V5M16 20v-7M22 20H2"/></svg>;
  if (name === "media") return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m5 18 5-5 3 3 2-2 4 4"/></svg>;
  if (name === "plus") return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
  return <svg {...common}><path d="M5 12h14M14 7l5 5-5 5"/></svg>;
}

const stats = [
  { icon: "class" as IconName, label: "Kelas Aktif", value: "4", note: "Tahun ajaran 2026/2027" },
  { icon: "student" as IconName, label: "Siswa", value: "128", note: "Terdaftar di kelas aktif" },
  { icon: "assignment" as IconName, label: "Tugas Aktif", value: "6", note: "3 tenggat minggu ini" },
  { icon: "question" as IconName, label: "Bank Soal", value: "50", note: "Siap digunakan kembali" },
];

const quickActions = [
  { href: "/teacher/cases", icon: "case" as IconName, title: "Buat Case", note: "Mulai dari konteks" },
  { href: "/teacher/questions", icon: "question" as IconName, title: "Buat Soal", note: "Susun pertanyaan" },
  { href: "/teacher/assignments", icon: "assignment" as IconName, title: "Buat Tugas", note: "Pilih kelas & jadwal" },
  { href: "/teacher/gis", icon: "gis" as IconName, title: "Buka GIS Studio", note: "Kelola layer & analisis" },
];

const modules = [
  { href: "/teacher/cases", icon: "case" as IconName, title: "Case", note: "Konteks, media, data, dan soal" },
  { href: "/teacher/questions", icon: "question" as IconName, title: "Bank Soal", note: "Kelola pertanyaan reusable" },
  { href: "/teacher/assignments", icon: "assignment" as IconName, title: "Penugasan", note: "Atur kelas, waktu, dan akses" },
  { href: "/teacher/results", icon: "result" as IconName, title: "Hasil", note: "Tinjau jawaban dan capaian" },
  { href: "/teacher/classes", icon: "student" as IconName, title: "Kelas & Siswa", note: "Kelola roster dan kode kelas" },
  { href: "/teacher/data", icon: "data" as IconName, title: "Bank Data", note: "Dataset spasial untuk pembelajaran" },
  { href: "/teacher/media", icon: "media" as IconName, title: "Media", note: "Gambar, video, dan dokumen" },
  { href: "/teacher/gis", icon: "gis" as IconName, title: "GIS Studio", note: "Layer, digitasi, dan analisis" },
];

export default function TeacherDashboard() {
  return (
    <main className={styles.dashboard}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Ruang Kerja Guru</p>
          <h1>Bangun pembelajaran spasial dari satu tempat.</h1>
          <p className={styles.heroText}>Siapkan case, susun soal, buat penugasan, dan pantau hasil siswa dalam alur yang lebih jelas dan terhubung.</p>
        </div>
        <div className={styles.heroActions}>
          <Link className={styles.secondaryAction} href="/teacher/questions"><Icon name="plus"/>Soal Baru</Link>
          <Link className={styles.primaryAction} href="/teacher/cases"><Icon name="plus"/>Buat Case</Link>
        </div>
      </section>

      <section className={styles.metrics} aria-label="Ringkasan ruang guru">
        {stats.map((item) => (
          <article className={styles.metric} key={item.label}>
            <span className={styles.metricIcon}><Icon name={item.icon}/></span>
            <div><small>{item.label}</small><strong>{item.value}</strong><p>{item.note}</p></div>
          </article>
        ))}
      </section>

      <section className={styles.contentGrid}>
        <article className={`${styles.panel} ${styles.panelMain}`}>
          <div className={styles.panelHead}>
            <div><p className={styles.kicker}>Monitoring</p><h2>Penugasan yang sedang berjalan</h2></div>
            <Link href="/teacher/assignments">Lihat semua →</Link>
          </div>
          <div className={styles.assignmentList}>
            <div className={styles.assignmentRow}><span className={`${styles.assignmentState} ${styles.active}`} /><div><strong>XI-A · Pengaruh Sungai</strong><small>WebGIS · Buffer · Influence</small></div><div className={styles.rowStat}><strong>24/32</strong><small>selesai</small></div></div>
            <div className={styles.assignmentRow}><span className={styles.assignmentState} /><div><strong>XI-B · Pola Permukiman</strong><small>Static Map · Pattern</small></div><div className={styles.rowStat}><strong>29/31</strong><small>selesai</small></div></div>
            <div className={styles.assignmentRow}><span className={`${styles.assignmentState} ${styles.warning}`} /><div><strong>XII-A · Banjir Rob Demak</strong><small>Composite · Association</small></div><div className={styles.rowStat}><strong>17/30</strong><small>selesai</small></div></div>
          </div>
        </article>

        <aside className={`${styles.panel} ${styles.quickPanel}`}>
          <div><p className={styles.kicker}>Akses Cepat</p><h2>Mulai dari yang Anda butuhkan.</h2><p className={styles.quickText}>Masuk langsung ke alur kerja yang paling sering digunakan saat menyiapkan pembelajaran.</p></div>
          <div className={styles.quickGrid}>
            {quickActions.map((item) => <Link href={item.href} key={item.href}><span className={styles.quickIcon}><Icon name={item.icon}/></span><strong>{item.title}</strong><small>{item.note}</small></Link>)}
          </div>
        </aside>
      </section>

      <section className={`${styles.panel} ${styles.modules}`}>
        <div className={styles.panelHead}><div><p className={styles.kicker}>Workspace</p><h2>Modul GeoLearn</h2></div></div>
        <div className={styles.moduleGrid}>
          {modules.map((item) => <Link href={item.href} key={item.href}><span className={styles.moduleIcon}><Icon name={item.icon}/></span><div><strong>{item.title}</strong><small>{item.note}</small></div></Link>)}
        </div>
      </section>
    </main>
  );
}
