import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Niche Music — how obscure is your taste, really?",
  description:
    "Connect Spotify or Apple Music and score your library against worldwide listening data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
