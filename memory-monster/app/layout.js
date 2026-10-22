import "./globals.css";

export const metadata = {
  title: "Memory Monster",
  description: "A door opens and a dark figure steps out when your computer's memory gets too full.",
};

export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
