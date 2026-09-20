import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WingGap — Bird-Safe Window Retrofit Planner",
  description:
    "Convert published bird-friendly visual-marker guidance into an inspectable, measurable exterior dot plan for a planar rectangular pane.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas text-ink font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
