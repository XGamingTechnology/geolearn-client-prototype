import Link from "next/link";
import LandingMapLoader from "@/components/landing-map-loader";
import styles from "./page.module.css";
import polish from "./page-polish.module.css";

type IconName="layers"|"brain"|"chart"|"users"|"book"|"graduation"|"info"|"arrow"|"map"|"clipboard"|"play"|"check";

function Icon({name,className=""}:{name:IconName;className?:string}){
  const common={className:`${styles.icon} ${className}`.trim(),viewBox:"0 0 24 24","aria-hidden":true} as const;
  if(name==="layers")return <svg {...common}><path d="m12 3 8 4-8 4-8-4 8-4Z"/><path d="m4 12 8 4 8-4"/><path d="m4 17 8 4 8-4"/></svg>;
  if(name==="brain")return <svg {...common}><path d="M9.5 4.5A3.5 3.5 0 0 0 6 8v.5A3.5 3.5 0 0 0 4.5 15 3.5 3.5 0 0 0 8 18.5V20"/><path d="M14.5 4.5A3.5 3.5 0 0 1 18 8v.5a3.5 3.5 0 0 1 1.5 6.5 3.5 3.5 0 0 1-3.5 3.5V20"/><path d="M9.5 4.5A2.5 2.5 0 0 1 12 7v13"/><path d="M14.5 4.5A2.5 2.5 0 0 0 12 7"/><path d="M8 10h2M14 10h2M8.5 15H10M14 15h1.5"/></svg>;
  if(name==="chart")return <svg {...common}><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></svg>;
  if(name==="users")return <svg {...common}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 20v-1.5A4.5 4.5 0 0 1 8 14h2a4.5 4.5 0 0 1 4.5 4.5V20"/><path d="M14.5 15.5a4 4 0 0 1 6 3.5v1"/></svg>;
  if(name==="book")return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z"/></svg>;
  if(name==="graduation")return <svg {...common}><path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M7 12v4c2.7 2 7.3 2 10 0v-4"/><path d="M21 9v5"/></svg>;
  if(name==="info")return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 10v6"/><path d="M12 7h.01"/></svg>;
  if(name==="arrow")return <svg {...common}><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></svg>;
  if(name==="map")return <svg {...common}><path d="m3 6 5-3 8 3 5-3v15l-5 3-8-3-5 3V6Z"/><path d="M8 3v15M16 6v15"/></svg>;
  if(name==="clipboard")return <svg {...common}><path d="M9 5h6"/><path d="M9 3h6v4H9z"/><path d="M7 5H5v16h14V5h-2"/><path d="M8 11h8M8 15h8"/></svg>;
  if(name==="play")return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4V8Z"/></svg>;
  if(name==="check")return <svg {...common}><path d="m5 12 4 4L19 6"/></svg>;
  return null;
}

const features=[
  {icon:"map" as IconName,title:"Spatial Thinking",copy:"Memahami lokasi, pola, hubungan, wilayah, dan pengaruh."},
  {icon:"layers" as IconName,title:"Question-driven WebGIS",copy:"GIS muncul ketika diperlukan oleh pertanyaan."},
  {icon:"chart" as IconName,title:"Evidence-based Learning",copy:"Aktivitas, jawaban, dan proses spasial dapat dianalisis."},
];

const workflow=[
  {icon:"book" as IconName,title:"Siapkan Case & Soal",copy:"Guru menyiapkan stimulus spasial dan pertanyaan."},
  {icon:"clipboard" as IconName,title:"Buat Penugasan",copy:"Pilih soal, kelas, dan waktu pengerjaan."},
  {icon:"map" as IconName,title:"Buka WebGIS",copy:"Siswa membaca stimulus dan menjelajahi data."},
  {icon:"brain" as IconName,title:"Analisis & Jawab",copy:"Siswa menggunakan bukti spasial untuk menjawab."},
  {icon:"chart" as IconName,title:"Lihat Hasil",copy:"Guru meninjau jawaban dan hasil pembelajaran."},
];

export default function PublicHome(){
  return <main className={`${styles.page} ${polish.page}`}>
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link className={styles.brand} href="/">
          <span className={styles.logoMark}><Icon name="layers" className={styles.iconLarge}/></span>
          <span className={styles.brandName}>GeoLearn</span>
          <span className={styles.brandTagline}>Spatial Thinking<br/>for a Better Tomorrow</span>
        </Link>
        <nav className={styles.nav} aria-label="Navigasi publik">
          <a href="#tentang">Tentang</a><a href="#cara-kerja">Cara Kerja</a><a href="#demo-webgis">Demo</a>
        </nav>
        <div className={styles.headerActions}>
          <Link className={styles.buttonOutline} href="/teacher-login"><Icon name="book" className={styles.iconSmall}/>Masuk Guru</Link>
          <Link className={styles.button} href="/student-login"><Icon name="graduation" className={styles.iconSmall}/>Masuk Siswa</Link>
        </div>
      </div>
    </header>

    <section className={`${styles.hero} ${polish.hero}`} id="tentang">
      <div className={`${styles.heroInner} ${polish.heroInner}`}>
        <div className={`${styles.heroCopy} ${polish.heroCopy}`}>
          <p className={styles.eyebrow}>Pendidikan geografi untuk generasi masa depan</p>
          <h1 className={`${styles.heroTitle} ${polish.heroTitle}`}>Belajar geografi<br/>dengan berpikir<br/>secara <span>spasial.</span></h1>
          <p className={`${styles.lede} ${polish.lede}`}>GeoLearn membantu siswa memahami lokasi, pola, hubungan, dan pengaruh melalui pertanyaan, data, dan WebGIS interaktif.</p>
          <div className={styles.heroButtons}>
            <Link className={styles.button} href="/student-login"><Icon name="graduation"/>Masuk sebagai Siswa</Link>
            <a className={styles.buttonOutline} href="#demo-webgis"><Icon name="play"/>Coba Demo 60 Detik</a>
          </div>
          <div className={`${styles.proofs} ${polish.proofs}`} aria-label="Kemampuan GeoLearn">
            <div className={`${styles.proof} ${polish.proof}`}><span className={styles.proofIcon}><Icon name="brain"/></span><span><strong>Spatial Thinking</strong><small>Lebih dari sekadar menghafal peta.</small></span></div>
            <div className={`${styles.proof} ${polish.proof}`}><span className={styles.proofIcon}><Icon name="layers"/></span><span><strong>WebGIS interaktif</strong><small>Data nyata dalam pertanyaan.</small></span></div>
            <div className={`${styles.proof} ${polish.proof}`}><span className={styles.proofIcon}><Icon name="chart"/></span><span><strong>Analitik pembelajaran</strong><small>Melihat proses dan perkembangan.</small></span></div>
          </div>
        </div>

        <div id="demo-webgis" className={`${styles.mapDemo} ${polish.mapDemo}`}>
          <LandingMapLoader />
        </div>
      </div>
    </section>

    <div className={styles.bridge}>
      <section className={`${styles.workflowSection} ${polish.reveal}`} id="cara-kerja">
        <div className={`${styles.sectionHeading} ${polish.sectionHeading}`}>
          <p className={styles.sectionEyebrow}>Cara Kerja</p>
          <h2>Dari pertanyaan geografi ke analisis spasial yang nyata.</h2>
          <p>GeoLearn menjaga alur belajar tetap sederhana, sementara WebGIS hadir tepat saat siswa membutuhkannya.</p>
        </div>
        <div className={styles.workflowGrid}>
          {workflow.map((step,index)=><article className={`${styles.workflowCard} ${polish.workflowCard}`} key={step.title}>
            <div className={styles.workflowTop}><span className={styles.stepNumber}>{String(index+1).padStart(2,"0")}</span><span className={styles.workflowIcon}><Icon name={step.icon}/></span></div>
            <h3>{step.title}</h3><p>{step.copy}</p>
            {index<workflow.length-1&&<span className={styles.workflowArrow}><Icon name="arrow" className={styles.iconSmall}/></span>}
          </article>)}
        </div>
      </section>
    </div>

    <section className={`${styles.studentStrip} ${polish.reveal}`}>
      <div className={`${styles.studentStripInner} ${polish.studentStripInner}`}>
        <div className={`${styles.studentIntro} ${polish.studentIntro}`}><span className={styles.studentIcon}><Icon name="users" className={styles.iconLarge}/></span><div><h2>Ruang Siswa</h2><p>Sudah mendapat Kode Kelas, ID Siswa, dan PIN dari guru?</p></div></div>
        <Link className={styles.button} href="/student-login">Masuk Ke Kelas <Icon name="arrow" className={styles.iconSmall}/></Link>
        <div className={styles.studentNote}><Icon name="info"/><span>Tidak perlu membuat akun.<br/>Cukup gunakan data yang diberikan oleh guru.</span></div>
      </div>
    </section>

    <section className={`${styles.featureSection} ${polish.reveal}`}>
      <div className={styles.featureGrid}>{features.map((feature)=><article className={`${styles.featureCard} ${polish.featureCard}`} key={feature.title}><span className={styles.featureIcon}><Icon name={feature.icon} className={styles.iconLarge}/></span><div><h3>{feature.title}</h3><p>{feature.copy}</p></div><span className={styles.featureCheck}><Icon name="check" className={styles.iconSmall}/></span></article>)}</div>
    </section>

    <section className={`${styles.closing} ${polish.closing} ${polish.reveal}`}><div className={`${styles.closingContent} ${polish.closingContent}`}><h2>Geografi hari ini, solusi untuk esok.</h2><p>GeoLearn mendukung guru dan siswa dalam membangun pemahaman spasial yang relevan dengan dunia nyata.</p><div className={`${styles.closingActions} ${polish.closingActions}`}><Link className={styles.button} href="/teacher-login">Masuk sebagai Guru</Link><Link className={styles.buttonOutline} href="/learn/demo">Buka Demo Pembelajaran</Link></div></div></section>

    <footer className={styles.footer}><div className={styles.footerInner}><div className={styles.footerBrandWrap}><span className={styles.footerBrand}><Icon name="layers" className={styles.iconSmall}/>GeoLearn</span><span>© 2026 GeoLearn. All rights reserved.</span></div><nav className={styles.footerLinks} aria-label="Navigasi footer"><a href="#tentang">Tentang</a><a href="#cara-kerja">Cara Kerja</a><Link href="/learn/demo">Demo</Link><Link href="/teacher-login">Guru</Link><Link href="/student-login">Siswa</Link></nav></div></footer>
  </main>;
}
