import type { Metadata } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

const introBootstrap = `(() => {
  const key = "arbeitsmarkt-radar-intro";
  const legacyKey = "arbeitsmarkt-radar-intro-seen";
  const cooldown = 12 * 60 * 60 * 1000;
  let skip = false;
  try {
    const raw = localStorage.getItem(key);
    const shownAt = raw ? Number(JSON.parse(raw)?.shownAt) : 0;
    skip = Number.isFinite(shownAt) && shownAt > 0 && Date.now() - shownAt < cooldown;

    if (!skip && sessionStorage.getItem(legacyKey) === "true") {
      localStorage.setItem(key, JSON.stringify({ shownAt: Date.now() }));
      sessionStorage.removeItem(legacyKey);
      skip = true;
    }
  } catch {}
  document.documentElement.dataset.introState = skip ? "skip" : "show";
})();`;

export const metadata: Metadata = {
  title: "Arbeitsmarkt Radar",
  description: "Entdecke, in welchen deutschen Regionen dein berufliches Profil besonders gefragt ist.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: introBootstrap }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
