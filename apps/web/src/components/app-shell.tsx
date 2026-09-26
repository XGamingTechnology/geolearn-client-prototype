"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import styles from "./teacher-shell.module.css";

type IconName = "home" | "question" | "assignment" | "result" | "class" | "data" | "media" | "gis" | "account" | "plus" | "more" | "layers" | "spark";

type NavItem = { href: string; label: string; short: string; icon: IconName; admin?: boolean };

const primaryNavigation: NavItem[] = [
  { href: "/teacher", label: "Dashboard", short: "Home", icon: "home" },
  { href: "/teacher/questions", label: "Soal", short: "Soal", icon: "question" },
  { href: "/teacher/assignments", label: "Penugasan", short: "Tugas", icon: "assignment" },
  { href: "/teacher/results", label: "Hasil", short: "Hasil", icon: "result" },
  { href: "/teacher/classes", label: "Kelas & Siswa", short: "Kelas", icon: "class" },
];

const resourceNavigation: NavItem[] = [
  { href: "/teacher/data", label: "Bank Data", short: "Data", icon: "data" },
  { href: "/teacher/media", label: "Media", short: "Media", icon: "media" },
  { href: "/teacher/gis", label: "GIS Studio", short: "GIS", icon: "gis" },
];

const creativeNavigation: NavItem[] = [
  { href: "/teacher/geolab", label: "GeoLab", short: "GeoLab", icon: "spark" },
];

const settingsNavigation: NavItem[] = [
  { href: "/teacher/accounts", label: "Akun & Akses", short: "Akun", icon: "account", admin: true },
];

const titleByPath: Array<[string, string, string]> = [
  ["/teacher/questions", "Soal", "Buat dan kelola pengalaman assessment"],
  ["/teacher/assignments", "Penugasan", "Kirim soal ke kelas dan atur jadwal"],
  ["/teacher/results", "Hasil", "Tinjau pengerjaan dan jawaban siswa"],
  ["/teacher/classes", "Kelas & Siswa", "Kelola kelas dan akses siswa"],
  ["/teacher/data", "Bank Data", "Kelola dataset spasial"],
  ["/teacher/media", "Media", "Kelola materi pendukung"],
  ["/teacher/gis", "GIS Studio", "Siapkan layer dan analisis"],
  ["/teacher/geolab", "GeoLab", "Ruang kreatif pembelajaran berbasis peta"],
  ["/teacher/accounts", "Akun & Akses", "Kelola pengguna sekolah"],
  ["/teacher", "Dashboard", "Ruang kerja guru GeoLearn"],
];

function Icon({ name }: { name: IconName }) {
  const common = { viewBox: "0 0 24 24", "aria-hidden": true } as const;
  if (name === "home") return <svg {...common}><path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></svg>;
  if (name === "question") return <svg {...common}><path d="M9.5 9a2.5 2.5 0 1 1 4.1 1.9c-1.1.8-1.6 1.2-1.6 2.6"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg>;
  if (name === "assignment") return <svg {...common}><path d="M9 4h6M9 2h6v4H9z"/><path d="M7 4H5v17h14V4h-2"/><path d="m8 12 2 2 5-5M8 18h8"/></svg>;
  if (name === "result") return <svg {...common}><path d="M4 20V11M10 20V5M16 20v-7M22 20H2"/></svg>;
  if (name === "class") return <svg {...common}><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20a5.5 5.5 0 0 1 11 0M13 16a4.5 4.5 0 0 1 8.5 2"/></svg>;
  if (name === "data") return <svg {...common}><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>;
  if (name === "media") return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m5 18 5-5 3 3 2-2 4 4"/></svg>;
  if (name === "gis") return <svg {...common}><path d="m3 6 5-3 8 3 5-3v15l-5 3-8-3-5 3V6Z"/><path d="M8 3v15M16 6v15"/></svg>;
  if (name === "account") return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
  if (name === "plus") return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
  if (name === "more") return <svg {...common}><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>;
  if (name === "spark") return <svg {...common}><path d="m12 2 1.7 5.2L19 9l-5.3 1.8L12 16l-1.7-5.2L5 9l5.3-1.8L12 2Z"/><path d="m19 15 .8 2.4 2.2.8-2.2.8L19 22l-.8-2.8-2.2-.8 2.2-.8L19 15Z"/></svg>;
  return <svg {...common}><path d="m12 3 8 4-8 4-8-4 8-4Z"/><path d="m4 12 8 4 8-4M4 17l8 4 8-4"/></svg>;
}

export function TeacherShell({ children, displayName, schoolName, canManageAccounts }: { children: ReactNode; displayName: string; schoolName: string | null; canManageAccounts: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) => href === "/teacher" ? pathname === href : pathname.startsWith(href);
  const context = titleByPath.find(([href]) => href === "/teacher" ? pathname === href : pathname.startsWith(href)) ?? titleByPath[titleByPath.length - 1];
  const visibleSettings = settingsNavigation.filter((item) => !item.admin || canManageAccounts);
  const allNavigation = [...primaryNavigation, ...resourceNavigation, ...creativeNavigation, ...visibleSettings];
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0,2).map((part) => part[0]).join("").toUpperCase() || "GU";

  const renderNav = (items: NavItem[]) => items.map((item) => (
    <Link className={isActive(item.href) ? styles.active : ""} href={item.href} key={item.href}>
      <span className={styles.navIcon}><Icon name={item.icon}/></span>
      <span>{item.label}</span>
    </Link>
  ));

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link className={styles.brand} href="/teacher">
          <span className={styles.brandMark}><Icon name="layers"/></span>
          <span className={styles.brandText}><strong>GeoLearn</strong><small>Pendidikan Geospasial</small></span>
        </Link>

        <div className={styles.navLabel}>Utama</div>
        <nav className={styles.nav} aria-label="Navigasi utama guru">{renderNav(primaryNavigation)}</nav>

        <div className={styles.navLabel}>Sumber Daya</div>
        <nav className={styles.nav} aria-label="Sumber daya guru">{renderNav(resourceNavigation)}</nav>

        <div className={styles.navLabel}>Kreatif</div>
        <nav className={`${styles.nav} ${styles.creativeNav}`} aria-label="Fitur kreatif">{renderNav(creativeNavigation)}</nav>

        {!!visibleSettings.length&&<><div className={styles.navLabel}>Pengaturan</div><nav className={styles.nav} aria-label="Pengaturan guru">{renderNav(visibleSettings)}</nav></>}

        <div className={styles.sidebarFoot}>
          <div className={styles.sidebarTip}><strong>Jelajahi dunia melalui peta.</strong><span>Bangun pengalaman belajar yang lebih bermakna dengan data dan ruang.</span></div>
        </div>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.context}>
            <span className={styles.contextIcon}><Icon name={allNavigation.find((item) => isActive(item.href))?.icon ?? "home"}/></span>
            <span className={styles.contextText}><strong>{context[1]}</strong><small>{context[2]}</small></span>
          </div>

          <div className={styles.actions}>
            <Link className={styles.quickButton} href="/teacher/questions/new"><Icon name="plus"/><span>Buat Soal</span></Link>
            <div className={styles.profile} title={schoolName ?? "GeoLearn"}>
              <span className={styles.avatar}>{initials}</span>
              <span className={styles.profileText}><strong>{displayName}</strong><small>{schoolName ?? "GeoLearn"}</small></span>
            </div>
            <form action="/api/auth/logout" method="post"><button className={styles.logout} type="submit">Keluar</button></form>
          </div>
        </header>

        <div className={styles.main}>{children}</div>
      </div>

      <nav className={styles.mobileNav} aria-label="Navigasi guru seluler">
        {primaryNavigation.slice(0,4).map((item) => (
          <Link className={isActive(item.href) ? styles.active : ""} href={item.href} key={item.href}><Icon name={item.icon}/><span>{item.short}</span></Link>
        ))}
        <Link className={allNavigation.slice(4).some((item) => isActive(item.href)) ? styles.active : ""} href="/teacher/more"><Icon name="more"/><span>Lainnya</span></Link>
      </nav>
    </div>
  );
}
