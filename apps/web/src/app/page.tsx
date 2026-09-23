import Link from "next/link";
import styles from "./page.module.css";

type IconName="layers"|"brain"|"chart"|"users"|"book"|"graduation"|"search"|"info"|"arrow"|"map";

function Icon({name,className=""}:{name:IconName;className?:string}){
  const common={className:`${styles.icon} ${className}`.trim(),viewBox:"0 0 24 24","aria-hidden":true} as const;
  if(name==="layers")return <svg {...common}><path d="m12 3 8 4-8 4-8-4 8-4Z"/><path d="m4 12 8 4 8-4"/><path d="m4 17 8 4 8-4"/></svg>;
  if(name==="brain")return <svg {...common}><path d="M9.5 4.5A3.5 3.5 0 0 0 6 8v.5A3.5 3.5 0 0 0 4.5 15 3.5 3.5 0 0 0 8 18.5V20"/><path d="M14.5 4.5A3.5 3.5 0 0 1 18 8v.5a3.5 3.5 0 0 1 1.5 6.5 3.5 3.5 0 0 1-3.5 3.5V20"/><path d="M9.5 4.5A2.5 2.5 0 0 1 12 7v13"/><path d="M14.5 4.5A2.5 2.5 0 0 0 12 7"/><path d="M8 10h2M14 10h2M8.5 15H10M14 15h1.5"/></svg>;
  if(name==="chart")return <svg {...common}><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></svg>;
  if(name==="users")return <svg {...common}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 20v-1.5A4.5 4.5 0 0 1 8 14h2a4.5 4.5 0 0 1 4.5 4.5V20"/><path d="M14.5 15.5a4 4 0 0 1 6 3.5v1"/></svg>;
  if(name==="book")return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z"/></svg>;
  if(name==="graduation")return <svg {...common}><path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M7 12v4c2.7 2 7.3 2 10 0v-4"/><path d="M21 9v5"/></svg>;
  if(name==="search")return <svg {...common}><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg>;
  if(name==="info")return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 10v6"/><path d="M12 7h.01"/></svg>;
  if(name==="arrow")return <svg {...common}><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></svg>;
  if(name==="map")return <svg {...common}><path d="m3 6 5-3 8 3 5-3v15l-5 3-8-3-5 3V6Z"/><path d="M8 3v15M16 6v15"/></svg>;
  return null;
}

const features=[
  {icon:"map" as IconName,title:"Spatial Thinking",copy:"Memahami lokasi, pola, hubungan, wilayah, dan pengaruh."},
  {icon:"layers" as IconName,title:"Question-driven WebGIS",copy:"GIS muncul ketika diperlukan oleh pertanyaan."},
  {icon:"chart" as IconName,title:"Evidence-based Learning",copy:"Aktivitas, jawaban, dan proses spasial dapat dianalisis."},
];

export default function PublicHome(){
  return <main className={styles.page}>
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link className={styles.brand} href="/">
          <span className={styles.logoMark}><Icon name="layers" className={styles.iconLarge}/></span>
          <span className={styles.brandName}>GeoLearn</span>
          <span className={styles.brandTagline}>Spatial Thinking<br/>for a Better Tomorrow</span>
        </Link>
        <nav className={styles.nav} aria-label="Navigasi publik">
          <a href="#tentang">Tentang</a><a href="#cara-kerja">Cara Kerja</a><Link href="/learn/demo">Demo</Link>
        </nav>
        <div className={styles.headerActions}>
          <Link className={styles.buttonOutline} href="/teacher-login"><Icon name="book" className={styles.iconSmall}/>Masuk Guru</Link>
          <Link className={styles.button} href="/student-login"><Icon name="graduation" className={styles.iconSmall}/>Masuk Siswa</Link>
        </div>
      </div>
    </header>

    <section className={styles.hero} id="tentang">
      <div className={styles.heroInner}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Pendidikan geografi untuk generasi masa depan</p>
          <h1 className={styles.heroTitle}>Belajar geografi<br/>dengan berpikir<br/>secara <span>spasial.</span></h1>
          <p className={styles.lede}>GeoLearn membantu siswa memahami lokasi, pola, hubungan, dan pengaruh melalui pertanyaan, data, dan WebGIS interaktif.</p>
          <div className={styles.heroButtons}>
            <Link className={styles.button} href="/student-login"><Icon name="graduation"/>Masuk sebagai Siswa</Link>
            <Link className={styles.buttonOutline} href="/teacher-login"><Icon name="users"/>Masuk sebagai Guru</Link>
          </div>
          <div className={styles.proofs} aria-label="Kemampuan GeoLearn">
            <div className={styles.proof}><span className={styles.proofIcon}><Icon name="brain"/></span><span><strong>Spatial Thinking</strong><small>Lebih dari sekadar menghafal peta.</small></span></div>
            <div className={styles.proof}><span className={styles.proofIcon}><Icon name="layers"/></span><span><strong>WebGIS interaktif</strong><small>Data nyata dalam pertanyaan.</small></span></div>
            <div className={styles.proof}><span className={styles.proofIcon}><Icon name="chart"/></span><span><strong>Analitik pembelajaran</strong><small>Melihat proses dan perkembangan.</small></span></div>
          </div>
        </div>

        <div className={styles.mapPanel} aria-label="Ilustrasi WebGIS GeoLearn">
          <div className={styles.mapTexture}/><div className={styles.river}/><div className={styles.roadA}/><div className={styles.roadB}/><div className={styles.roadC}/>
          <div className={styles.searchBox}><Icon name="search" className={styles.iconSmall}/>Cari lokasi, tempat, atau koordinat...</div>
          <div className={styles.mapTools} aria-hidden="true"><button type="button">⌖</button><button type="button">+</button><button type="button">−</button><button type="button">≡</button></div>
          <div className={styles.layersCard}>
            {["Sekolah","Sungai","Batas Administrasi","Citra Satelit","Topografi"].map((label,index)=><div className={styles.layerRow} key={label}><span className={`${styles.checkbox} ${index===0?styles.checkboxActive:""}`}/><span className={styles.layerDot}/><span>{label}</span></div>)}
          </div>
          <div className={styles.buffer}/><span className={styles.bufferLabel}>500 m</span>
          <span className={`${styles.mapPoint} ${styles.mapPointA}`}/><span className={`${styles.mapPoint} ${styles.mapPointB}`}/><span className={`${styles.mapPoint} ${styles.mapPointC}`}/><span className={styles.sourcePoint}/><span className={styles.targetPoint}/><span className={styles.relationLine}/>
          <div className={styles.questionCard}><small>Contoh Pertanyaan</small><strong>Sekolah mana yang berada dalam radius 500 m dari sungai?</strong><span className={styles.questionNext}><Icon name="arrow" className={styles.iconSmall}/></span></div>
        </div>
      </div>
    </section>

    <section className={styles.studentStrip} id="cara-kerja">
      <div className={styles.studentStripInner}>
        <div className={styles.studentIntro}><span className={styles.studentIcon}><Icon name="users" className={styles.iconLarge}/></span><div><h2>Ruang Siswa</h2><p>Sudah mendapat Kode Kelas, ID Siswa, dan PIN dari guru?</p></div></div>
        <Link className={styles.button} href="/student-login">Masuk Ke Kelas <Icon name="arrow" className={styles.iconSmall}/></Link>
        <div className={styles.studentNote}><Icon name="info"/><span>Tidak perlu membuat akun.<br/>Cukup gunakan data yang diberikan oleh guru.</span></div>
      </div>
    </section>

    <section className={styles.featureSection}>
      <div className={styles.featureGrid}>{features.map((feature)=><article className={styles.featureCard} key={feature.title}><span className={styles.featureIcon}><Icon name={feature.icon} className={styles.iconLarge}/></span><div><h3>{feature.title}</h3><p>{feature.copy}</p></div><span className={styles.featureArrow}><Icon name="arrow" className={styles.iconSmall}/></span></article>)}</div>
    </section>

    <section className={styles.closing}><div className={styles.closingContent}><h2>Geografi hari ini, solusi untuk esok.</h2><p>GeoLearn mendukung guru dan siswa dalam membangun pemahaman spasial yang relevan dengan dunia nyata.</p></div></section>

    <footer className={styles.footer}><div className={styles.footerInner}><span className={styles.footerBrand}><Icon name="layers" className={styles.iconSmall}/>GeoLearn</span><span>Spatial Thinking · WebGIS · Learning Analytics</span></div></footer>
  </main>;
}
