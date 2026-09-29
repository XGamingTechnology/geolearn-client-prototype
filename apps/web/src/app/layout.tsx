import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://geothink.pro"),
  title: {
    default: "GeoThink",
    template: "%s | GeoThink",
  },
  description: "Spatial Thinking dan WebGIS untuk pembelajaran geografi SMA.",
  applicationName: "GeoThink",
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
