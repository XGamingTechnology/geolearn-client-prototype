"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { Pane } from "react-leaflet";
import {
  clampSliderPosition,
  DEFAULT_SLIDER_POSITION,
} from "@/features/maps/map-swipe";
import styles from "./map-swipe-divider.module.css";

export function SwipeLayerPane({ children }: { children: React.ReactNode }) {
  return (
    <Pane
      name="geolearn-swipe-target"
      className={styles.pane}
      style={{ zIndex: 410 }}
    >
      {children}
    </Pane>
  );
}

export function SwipeContextPane({ children }: { children: React.ReactNode }) {
  return <Pane name="geolearn-swipe-context" style={{zIndex:420}}>{children}</Pane>;
}

export function MapSwipeDivider({
  questionKey,
  sourceTitle,
  targetTitle,
  valid = true,
}: {
  questionKey: string;
  sourceTitle?: string;
  targetTitle?: string;
  valid?: boolean;
}) {
  const [position, setPosition] = useState(DEFAULT_SLIDER_POSITION);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => setPosition(DEFAULT_SLIDER_POSITION), [questionKey]);
  function update(clientX: number) {
    const bounds = root.current?.parentElement?.getBoundingClientRect();
    if (bounds?.width)
      setPosition(
        clampSliderPosition(((clientX - bounds.left) / bounds.width) * 100),
      );
  }
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    update(event.clientX);
  }
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    let next = position;
    if (event.key === "ArrowLeft") next -= 3;
    else if (event.key === "ArrowRight") next += 3;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = 100;
    else return;
    event.preventDefault();
    event.stopPropagation();
    setPosition(clampSliderPosition(next));
  }
  return (
    <div
      ref={root}
      className={styles.overlay}
      style={{ "--swipe-position": `${position}%` } as React.CSSProperties}
    >
      <style>{`.${styles.pane}{clip-path:inset(0 0 0 ${100 - position}%);}`}</style>
      <div className={`${styles.label} ${styles.source}`}>
        <b>SOURCE</b>
        <span>{sourceTitle ?? "Layer tidak tersedia"}</span>
      </div>
      <div className={`${styles.label} ${styles.target}`}>
        <b>TARGET</b>
        <span>{targetTitle ?? "Layer tidak tersedia"}</span>
      </div>
      {!valid && (
        <div className={styles.invalid} role="status">
          Map Slider memerlukan layer SOURCE dan TARGET.
        </div>
      )}
      <div
        className={styles.hit}
        style={{ left: `${position}%` }}
        role="slider"
        tabIndex={0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        aria-label="Pembagi perbandingan SOURCE dan TARGET"
        onKeyDown={keyDown}
        onPointerDown={pointerDown}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            update(event.clientX);
        }}
        onPointerUp={(event) =>
          event.currentTarget.releasePointerCapture(event.pointerId)
        }
        onClick={(event) => event.stopPropagation()}
      >
        <span className={styles.line} />
        <span className={styles.handle} aria-hidden="true">
          ↔
        </span>
      </div>
    </div>
  );
}
