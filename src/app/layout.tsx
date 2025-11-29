import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Notebook",
  description: "Un notebook personal estilo Google Colab con Markdown, dibujos y imagenes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
