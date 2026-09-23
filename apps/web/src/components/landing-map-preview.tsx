import styles from "./landing-map-demo.module.css";

type LandingMapPreviewProps = {
  compact?: boolean;
};

export default function LandingMapPreview({ compact = false }: LandingMapPreviewProps) {
  return (
    <div className={`${styles.preview} ${compact ? styles.previewCompact : ""}`} aria-hidden="true">
      <svg viewBox="0 0 720 465" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="demo-grid" width="44" height="44" patternUnits="userSpaceOnUse">
            <path d="M44 0H0V44" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
          <filter id="demo-soft-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.16" />
          </filter>
        </defs>
        <rect width="720" height="465" className={styles.previewLand} />
        <rect width="720" height="465" fill="url(#demo-grid)" className={styles.previewGrid} />
        <path
          className={styles.previewRoad}
          d="M32 352 C156 298 205 325 310 280 S504 224 688 248 M64 120 C182 164 282 145 378 112 S566 75 700 113"
        />
        <path
          className={styles.previewRoadSecondary}
          d="M118 18 C142 114 192 184 279 220 S458 286 598 414 M480 18 C433 110 426 180 452 247 S516 365 558 456"
        />
        <path
          className={styles.previewBuffer}
          d="M378 20 C347 76 352 122 390 161 C423 195 431 229 412 267 C394 305 399 346 430 382 C450 406 459 433 456 465 L330 465 C335 425 325 397 302 370 C269 332 266 287 285 247 C303 210 297 178 266 143 C232 105 224 61 247 20 Z"
        />
        <path
          className={styles.previewRiver}
          d="M318 0 C286 58 298 105 337 146 C376 187 384 219 362 264 C340 309 348 346 382 385 C409 416 418 442 414 465"
        />
        <g className={styles.previewRelations}>
          <path d="M355 226 L375 214" />
          <path d="M452 180 L389 174" />
          <path d="M315 336 L352 322" />
        </g>
        <g filter="url(#demo-soft-shadow)">
          <g transform="translate(355 226)">
            <circle r="9" className={styles.previewSchoolInside} />
            <circle r="3" className={styles.previewSchoolCore} />
            <text x="13" y="4">SDN Cawang 01</text>
          </g>
          <g transform="translate(452 180)">
            <circle r="9" className={styles.previewSchoolOutside} />
            <circle r="3" className={styles.previewSchoolCore} />
            <text x="13" y="4">SDN Cawang 04</text>
          </g>
          <g transform="translate(315 336)">
            <circle r="9" className={styles.previewSchoolOutside} />
            <circle r="3" className={styles.previewSchoolCore} />
            <text x="13" y="4">SDN Cililitan 03</text>
          </g>
          <g transform="translate(404 111)">
            <circle r="9" className={styles.previewSchoolInside} />
            <circle r="3" className={styles.previewSchoolCore} />
            <text x="13" y="4">SDN Kebon Baru 11</text>
          </g>
        </g>
        <text x="300" y="448" className={styles.previewRiverLabel}>SUNGAI CILIWUNG</text>
      </svg>
      <div className={styles.previewStatus}>
        <span className={styles.loadingPulse} />
        <span>
          <strong>Jakarta · Ciliwung</strong>
          <small>Menyiapkan basemap interaktif…</small>
        </span>
      </div>
    </div>
  );
}
