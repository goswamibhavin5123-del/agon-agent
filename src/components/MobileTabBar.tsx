import { NavLink } from 'react-router-dom';
import { useAuth, homeFor } from '../contexts/AuthContext';
import { House, Users, Sun, Orbit, CircleUser } from 'lucide-react';

export default function MobileTabBar() {
  const { role } = useAuth();
  const items = [
    { to: '/', icon: House, label: 'Home' },
    { to: '/astrologers', icon: Users, label: 'Astrologers' },
    { to: '/horoscope', icon: Sun, label: 'Horoscope' },
    { to: '/kundli', icon: Orbit, label: 'Kundli' },
    { to: homeFor(role), icon: CircleUser, label: 'Account' },
  ];
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-pearl/95 backdrop-blur-xl border-t border-line safe-bottom">
      <div className="grid grid-cols-5">
        {items.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.to === '/'} className={({ isActive }) => `flex flex-col items-center gap-1 py-2.5 text-[10px] tracking-wide ${isActive ? 'text-rose-deep' : 'text-muted'}`}>
            {({ isActive }) => (<><span className={`h-8 w-12 rounded-full flex items-center justify-center transition ${isActive ? 'bg-blush' : ''}`}><i.icon className="h-5 w-5" /></span>{i.label}</>)}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
