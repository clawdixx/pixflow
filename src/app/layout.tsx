import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pixflow — Follow-up de Pagamentos via WhatsApp",
  description: "Automação de lembretes de pagamento via WhatsApp para freelancers brasileiros.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-white font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
