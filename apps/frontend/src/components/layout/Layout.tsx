import { ReactNode } from 'react';
import { Header } from './Header';
import { ImpersonationBanner } from './ImpersonationBanner';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="relative min-h-screen bg-background">
      <ImpersonationBanner />
      <Header />
      <main className="app-container px-4 py-6">{children}</main>
    </div>
  );
}
