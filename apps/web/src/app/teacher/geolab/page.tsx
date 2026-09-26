import Link from "next/link";
import styles from "./geolab.module.css";

type ModeIcon="story"|"game"|"canvas"|"arrow";

function Icon({name}:{name:ModeIcon}){
  const common={viewBox:"0 0 24 24","aria-hidden":true} as const;
  if(name==="story")return <svg {...common}><path d="M4 4h11l5 5v11H4z"/><path d="M15 4v5h5M8 13h8M8 17h5"/><path d="m7 9 2-2 2 2"/></svg>;
  if(name==="game")return <svg {...common}><path d="M8 8h8a5 5 0 0 1 4.7 6.7l-1.1 3a2.3 2.3 0 0 1-4  .6L13.8 16h-3.6l-1.8 2.3a2.3 2.3 0 0 1-4-.6l-1.1-3A5 5 0 0 1 8 8Z"/><path d="M7 12v4M5 14h4M16 12h.01M18 14h.01"/></svg>;
  if(name==="canvas")return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 9v11M12 13h5M12 16h4"/></svg>;
  return <svg {...common}><path d="M5 12h14M14 7l5 5-5 5"/></svg>;
}

const modes=[
  {icon:"story" as ModeIcon,title:"StoryMap",tagline:"Ceritakan dengan peta",description:"Gabungkan narasi, foto, video, data, dan scene peta menjadi cerita geospasial yang dapat dibuat guru atau siswa.",tone:"blue",features:["Scene peta","Narasi & media","Template siswa"]},
  {icon:"game" as ModeIcon,title:"GeoChallenge",tagline:"Belajar geografi sambil bermain",description:"Rancang tantangan lokasi, pencarian objek, misi spasial, clue, dan permainan berbasis peta untuk kelas.",tone:"amber",features:["Tebak lokasi","Misi spasial","Skor & clue"]},
  {icon:"canvas" as ModeIcon,title:"Map Canvas",tagline:"Bangun ide langsung di atas peta",description:"Susun peta, teks, gambar, anotasi, rute, hotspot, dan analisis dalam satu ruang kreatif berbasis map.",tone:"teal",features:["Drag & arrange","Anotasi peta","Karya siswa"]},
];

export default function GeoLabPage(){
  return <main className={styles.page}>
    <section className={styles.hero}>
      <div><p className={styles.kicker}>GeoLab</p><h1>Ruang kreatif untuk belajar dengan peta.</h1><p>Gunakan GeoLab ketika pembelajaran membutuhkan lebih dari sekadar soal: bercerita, bermain, bereksperimen, atau membuat karya geospasial.</p></div>
      <div className={styles.heroVisual} aria-hidden="true"><span/><span/><span/><i/></div>
    </section>

    <section className={styles.modeGrid} aria-label="Mode GeoLab">
      {modes.map((mode)=><article className={`${styles.modeCard} ${styles[mode.tone]}`} key={mode.title}>
        <div className={styles.modeTop}><span className={styles.modeIcon}><Icon name={mode.icon}/></span><span className={styles.modeNumber}>GeoLab</span></div>
        <div className={styles.modePreview} aria-hidden="true"><span/><span/><span/></div>
        <p className={styles.modeTagline}>{mode.tagline}</p>
        <h2>{mode.title}</h2>
        <p className={styles.modeDescription}>{mode.description}</p>
        <div className={styles.featureList}>{mode.features.map((item)=><span key={item}>{item}</span>)}</div>
      </article>)}
    </section>

    <section className={styles.workflow}>
      <div><p className={styles.kicker}>Cara Kerja</p><h2>GeoLab tetap sederhana untuk guru.</h2></div>
      <div className={styles.steps}><span><b>1</b>Pilih pengalaman</span><i/><span><b>2</b>Susun konten & peta</span><i/><span><b>3</b>Preview sebagai siswa</span><i/><span><b>4</b>Assign ke kelas</span></div>
    </section>

    <section className={styles.back}><Link href="/teacher">Kembali ke Dashboard <Icon name="arrow"/></Link></section>
  </main>;
}
