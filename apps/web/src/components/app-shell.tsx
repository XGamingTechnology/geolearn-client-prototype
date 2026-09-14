"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navigation = [
  { href: "/teacher", label: "Dashboard", short: "Home", icon: "⌂" },
  { href: "/teacher/classes", label: "Kelas", short: "Kelas", icon: "▦" },
  { href: "/teacher/assignments", label: "Penugasan", short: "Tugas", icon: "✓" },
  { href: "/teacher/questions", label: "Bank Soal", short: "Soal", icon: "?" },
  { href: "/teacher/cases", label: "Case", short: "Case", icon: "◇" },
  { href: "/teacher/data", label: "Bank Data", short: "Data", icon: "◫" },
  { href: "/teacher/media", label: "Media", short: "Media", icon: "▣" },
  { href: "/teacher/gis", label: "GIS Studio", short: "GIS", icon: "◎" },
  { href: "/teacher/results", label: "Hasil", short: "Hasil", icon: "◔" },
];

export function TeacherShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => href === "/teacher" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="teacher-shell">
      <header className="teacher-header">
        <Link className="brand" href="/teacher">
          <span className="brand-mark">G</span>
          <span>GeoLearn<small>Teacher Workspace</small></span>
        </Link>
        <nav className="teacher-desktop-nav" aria-label="Navigasi guru">
          {navigation.map((item) => (
            <Link className={isActive(item.href) ? "active" : ""} href={item.href} key={item.href}>{item.label}</Link>
          ))}
        </nav>
        <div className="teacher-actions">
          <span className="environment">STAGING</span>
          <div className="profile-chip"><span>GM</span><div><strong>Guru Geografi</strong><small>SMA Nusantara</small></div></div>
        </div>
      </header>
      <div className="teacher-main">{children}</div>
      <nav className="mobile-nav" aria-label="Navigasi guru seluler">
        {navigation.filter((item) => ["/teacher","/teacher/classes","/teacher/questions","/teacher/data"].includes(item.href)).map((item) => (
          <Link className={isActive(item.href) ? "active" : ""} href={item.href} key={item.href}>
            <span aria-hidden="true">{item.icon}</span><small>{item.short}</small>
          </Link>
        ))}
        <Link className={["/teacher/assignments", "/teacher/cases", "/teacher/media", "/teacher/gis", "/teacher/results", "/teacher/more"].some((href) => pathname.startsWith(href)) ? "active" : ""} href="/teacher/more">
          <span aria-hidden="true">•••</span><small>More</small>
        </Link>
      </nav>
    </div>
  );
}
