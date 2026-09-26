"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { StatusNotice } from "./status-notice";
import styles from "./auth-login.module.css";

type Role = "teacher" | "student";

type AuthLoginFormProps = {
  role: Role;
  errorMessage?: string;
};

function BrandMark() {
  return (
    <span className={styles.brandMark} aria-hidden="true">
      <svg viewBox="0 0 32 32">
        <path d="m16 4 11 5.5L16 15 5 9.5 16 4Z" />
        <path d="m6.5 15 9.5 4.8 9.5-4.8" />
        <path d="m6.5 20.5 9.5 4.8 9.5-4.8" />
      </svg>
    </span>
  );
}

function Icon({ name }: { name: "mail" | "lock" | "key" | "user" | "class" | "eye" | "eyeOff" | "arrow" | "spark" }) {
  const common = { viewBox: "0 0 24 24", "aria-hidden": true } as const;
  if (name === "mail") return <svg {...common}><path d="M3 6h18v12H3z"/><path d="m4 7 8 6 8-6"/></svg>;
  if (name === "lock") return <svg {...common}><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>;
  if (name === "key") return <svg {...common}><circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M15 12v2"/></svg>;
  if (name === "user") return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
  if (name === "class") return <svg {...common}><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/></svg>;
  if (name === "eye") return <svg {...common}><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.6"/></svg>;
  if (name === "eyeOff") return <svg {...common}><path d="M3 3l18 18"/><path d="M10.6 6.2A9.9 9.9 0 0 1 12 6c6.1 0 9.5 6 9.5 6a15 15 0 0 1-3 3.7M6.4 6.5C3.8 8.4 2.5 12 2.5 12s3.4 6 9.5 6c1 0 1.9-.2 2.8-.5"/></svg>;
  if (name === "arrow") return <svg {...common}><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></svg>;
  return <svg {...common}><path d="m12 2 1.7 5.2L19 9l-5.3 1.8L12 16l-1.7-5.2L5 9l5.3-1.8L12 2Z"/><path d="m19 15 .8 2.4 2.2.8-2.2.8L19 22l-.8-2.8-2.2-.8 2.2-.8L19 15Z"/></svg>;
}

export default function AuthLoginForm({ role, errorMessage }: AuthLoginFormProps) {
  const [showSecret, setShowSecret] = useState(false);
  const teacher = role === "teacher";

  const copy = teacher
    ? {
        eyebrow: "Ruang Guru",
        title: "Selamat datang kembali.",
        intro: "Masuk untuk membuat soal, menyiapkan penugasan, mengelola kelas, dan melihat hasil pembelajaran spasial.",
        visualTitle: "Dari soal ke pengalaman belajar spasial, dalam satu ruang kerja.",
        visualText: "Susun pengalaman belajar berbasis peta, data, dan analisis dengan alur yang jelas dari soal hingga hasil siswa.",
        image: "/auth-teacher-visual.svg",
        imageAlt: "Ilustrasi dashboard guru GeoLearn dengan soal, peta, penugasan, dan analitik hasil",
        action: "/api/auth/teacher/login",
        submit: "Masuk ke Ruang Guru",
        switchHref: "/student-login",
        switchLead: "Anda siswa?",
        switchLabel: "Masuk ke Ruang Siswa",
        chips: ["Soal & WebGIS", "Penugasan", "Hasil & Analitik"],
      }
    : {
        eyebrow: "Ruang Siswa",
        title: "Siap menjelajah?",
        intro: "Gunakan data dari guru untuk membuka penugasan, membaca stimulus, dan menjelajahi WebGIS.",
        visualTitle: "Baca konteks. Jelajahi peta. Temukan bukti.",
        visualText: "GeoLearn membantu Anda berpikir secara spasial, bukan hanya menghafal lokasi di peta.",
        image: "/auth-student-visual.svg",
        imageAlt: "Ilustrasi pengalaman belajar siswa GeoLearn dengan WebGIS, buffer, dan analisis spasial",
        action: "/api/auth/student/login",
        submit: "Masuk ke Ruang Belajar",
        switchHref: "/teacher-login",
        switchLead: "Anda guru?",
        switchLabel: "Masuk ke Ruang Guru",
        chips: ["Stimulus", "WebGIS", "Analisis & Jawab"],
      };

  return (
    <main className={`${styles.page} ${teacher ? styles.teacherTheme : styles.studentTheme}`}>
      <div className={styles.ambient} aria-hidden="true"><span/><span/><span/></div>

      <header className={styles.topbar}>
        <Link className={styles.brand} href="/" aria-label="Kembali ke GeoLearn">
          <BrandMark />
          <span className={styles.brandText}><strong>GeoLearn</strong><small>Spatial Thinking for a Better Tomorrow</small></span>
        </Link>
        <Link className={styles.homeLink} href="/">
          <span>Kembali ke beranda</span><Icon name="arrow" />
        </Link>
      </header>

      <section className={styles.shell}>
        <aside className={styles.visualPanel}>
          <div className={styles.visualGlow} aria-hidden="true" />
          <div className={styles.visualCopy}>
            <span className={styles.roleBadge}><Icon name="spark" /> {copy.eyebrow}</span>
            <h2>{copy.visualTitle}</h2>
            <p>{copy.visualText}</p>
            <div className={styles.chips}>{copy.chips.map((chip) => <span key={chip}>{chip}</span>)}</div>
          </div>
          <div className={styles.illustrationWrap}>
            <Image className={styles.illustration} src={copy.image} alt={copy.imageAlt} width={920} height={680} priority />
          </div>
          <div className={styles.orbitOne} aria-hidden="true" />
          <div className={styles.orbitTwo} aria-hidden="true" />
        </aside>

        <section className={styles.formPanel}>
          <div className={styles.formCard}>
            <div className={styles.formHeading}>
              <p className={styles.eyebrow}>{copy.eyebrow}</p>
              <h1>{copy.title}</h1>
              <p>{copy.intro}</p>
            </div>

            {errorMessage && <StatusNotice tone="error" title="Tidak dapat masuk" description={errorMessage} dismissible={false}/>} 

            <form action={copy.action} method="post">
              <div className={styles.fields}>
                {teacher ? (
                  <>
                    <label>
                      <span>Email</span>
                      <span className={styles.inputShell}><i><Icon name="mail" /></i><input name="email" type="email" placeholder="nama@sekolah.sch.id" autoComplete="username" required /></span>
                    </label>
                    <label>
                      <span>Password</span>
                      <span className={styles.inputShell}><i><Icon name="lock" /></i><input name="password" type={showSecret ? "text" : "password"} placeholder="Masukkan password" autoComplete="current-password" required /><button type="button" className={styles.secretToggle} onClick={() => setShowSecret((value) => !value)} aria-label={showSecret ? "Sembunyikan password" : "Tampilkan password"}><Icon name={showSecret ? "eyeOff" : "eye"} /></button></span>
                    </label>
                  </>
                ) : (
                  <>
                    <label>
                      <span>Kode Kelas</span>
                      <span className={styles.inputShell}><i><Icon name="class" /></i><input className={styles.uppercase} name="classCode" placeholder="GL-XIA-7K3Q" autoCapitalize="characters" autoComplete="off" required /></span>
                    </label>
                    <label>
                      <span>ID Siswa</span>
                      <span className={styles.inputShell}><i><Icon name="user" /></i><input name="loginId" placeholder="GL-11A-001" autoComplete="username" required /></span>
                    </label>
                    <label>
                      <span>PIN</span>
                      <span className={styles.inputShell}><i><Icon name="key" /></i><input name="pin" type={showSecret ? "text" : "password"} inputMode="numeric" pattern="[0-9]{4,12}" placeholder="Masukkan PIN" autoComplete="current-password" required /><button type="button" className={styles.secretToggle} onClick={() => setShowSecret((value) => !value)} aria-label={showSecret ? "Sembunyikan PIN" : "Tampilkan PIN"}><Icon name={showSecret ? "eyeOff" : "eye"} /></button></span>
                    </label>
                  </>
                )}
              </div>

              <button className={styles.submit} type="submit"><span>{copy.submit}</span><Icon name="arrow" /></button>
            </form>

            <div className={styles.helpBox}>
              <span className={styles.helpIcon}>?</span>
              <div>{teacher ? <><strong>Lupa password?</strong><p>Hubungi admin sekolah untuk bantuan akses akun.</p></> : <><strong>Kesulitan masuk?</strong><p>Periksa kembali Kode Kelas, ID Siswa, dan PIN atau hubungi guru Anda.</p></>}</div>
            </div>

            <div className={styles.switchRole}><span>{copy.switchLead}</span><Link href={copy.switchHref}>{copy.switchLabel} <Icon name="arrow" /></Link></div>
          </div>
        </section>
      </section>
    </main>
  );
}
