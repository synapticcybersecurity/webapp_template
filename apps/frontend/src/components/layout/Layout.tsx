import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { ImpersonationBanner } from './ImpersonationBanner';

/**
 * Application shell, mounted once as a route element.
 *
 * It renders an <Outlet/>, so navigating between pages swaps only the page
 * body. Previously each page imported <Layout> and wrapped itself, which meant
 * the header unmounted and remounted on every navigation — refetching the
 * admin pending-users count each time and losing any open menu.
 */
export function Layout() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <ImpersonationBanner />
      <Header />
      <main className="app-container flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
