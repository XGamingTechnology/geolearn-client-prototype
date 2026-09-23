"use client";

import dynamic from "next/dynamic";
import styles from "./landing-map-demo.module.css";

const LandingMapDemo = dynamic(() => import("./landing-map-demo"), {
  ssr: false,
  loading: () => (
    <div className={styles.loading} role="status" aria-live="polite">
      <span className={styles.loadingPulse} />
      <span>Menyiapkan demo WebGIS…</span>
    </div>
  ),
});

export default function LandingMapLoader() {
  return <LandingMapDemo />;
}
