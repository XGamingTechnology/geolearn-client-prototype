import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [{ href: "/teacher", label: "Ringkasan", icon: "⌂" }, { href: "/teacher/classes", label: "Kelas", icon: "▦" }, { href: "/teacher/questions", label: "Bank Soal", icon: "?" }, { href: "/teacher/assignments", label: "Penugasan", icon: "✓" }];

export function TeacherShell({ children }: { children: ReactNode }) {
  return <div className="teacher-shell">
    <aside className="sidebar"><Link className="brand" href="/teacher"><span className="brand-mark">G</span><span>GeoLearn<small>Ruang Guru</small></span></Link><nav aria-label="Navigasi guru">{navigation.map((item, index) => <Link className={index === 0 ? "active" : ""} href={item.href} key={item.href}><span aria-hidden="true">{item.icon}</span>{item.label}</Link>)}</nav><div className="teacher-card"><span>GM</span><div><strong>Guru Geografi</strong><small>Mode pratinjau</small></div></div></aside>
    <div className="teacher-main"><header className="teacher-topbar"><div><small>Ruang kerja</small><strong>SMA Nusantara</strong></div><span className="environment">Staging foundation</span></header>{children}</div>
    <nav className="mobile-nav" aria-label="Navigasi guru seluler">{navigation.map((item, index) => <Link className={index === 0 ? "active" : ""} href={item.href} key={item.href}><span aria-hidden="true">{item.icon}</span><small>{item.label}</small></Link>)}</nav>
  </div>;
}
