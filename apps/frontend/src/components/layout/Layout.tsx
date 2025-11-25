import { ReactNode } from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="relative min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
