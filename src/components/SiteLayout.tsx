import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import MobileTabBar from './MobileTabBar';

export default function SiteLayout({ hideTabBar = false }: { hideTabBar?: boolean }) {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1"><Outlet /></main>
      <Footer />
      {!hideTabBar && <MobileTabBar />}
    </div>
  );
}
