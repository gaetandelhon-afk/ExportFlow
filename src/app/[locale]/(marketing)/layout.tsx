import { Header } from '@/components/marketing/layout/Header';
import { Footer } from '@/components/marketing/layout/Footer';
import { MarketingThemeProvider } from '@/components/marketing/layout/MarketingThemeProvider';

export default function MarketingLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <MarketingThemeProvider>
      <div className="marketing flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </MarketingThemeProvider>
  );
}

