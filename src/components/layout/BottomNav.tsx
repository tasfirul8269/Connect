import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, PlaySquare, CalendarDays, Building2 } from 'lucide-react';

type Props = { placement?: 'floating' | 'inline'; sticky?: boolean };

const tabs = [
  { to: '/feed', label: 'Feed', icon: Home },
  { to: '/friends', label: 'Friends', icon: Users },
  { to: '/videos', label: 'Watch', icon: PlaySquare },
  { to: '/events', label: 'Events', icon: CalendarDays },
  { to: '/organizations', label: 'Orgs', icon: Building2 },
];

const BottomNav: React.FC<Props> = ({ placement = 'floating', sticky = false }) => {
  const { pathname } = useLocation();
  const isActive = (to: string) => pathname.startsWith(to);
  const activeIndex = tabs.findIndex(t => isActive(t.to));

  if (placement === 'inline') {
    return (
      <div className={`${sticky ? 'sticky top-2 z-10' : ''} mb-4`}>
        <div className="relative bg-gray-50 border border-gray-200 rounded-2xl px-1 py-1 h-14">
          {/* Sliding indicator */}
          <div
            className="absolute top-1 bottom-1 left-1 rounded-xl bg-[#26c66e] shadow-sm transition-transform duration-200"
            style={{ width: `${100 / tabs.length}%`, transform: `translateX(${Math.max(activeIndex, 0) * 100}%)` }}
          />
          <div className="relative z-10 grid grid-cols-5 h-full">
            {tabs.map(({ to, label, icon: Icon }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  className="flex flex-col items-center justify-center gap-0.5 rounded-xl"
                >
                  <Icon className={`h-5 w-5 ${active ? 'text-white' : 'text-gray-600'}`} />
                  <span className={`text-[11px] ${active ? 'text-white' : 'text-gray-700'}`}>{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <nav className="fixed inset-x-0 bottom-5 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto bg-white/95 backdrop-blur rounded-full shadow-lg ring-1 ring-gray-200 px-2 py-2 flex items-center gap-2">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? 'page' : undefined}
              className={`group px-3 py-2 rounded-full flex items-center gap-2 transition-all duration-200 ${active ? 'bg-[#26c66e] shadow-sm text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Icon className={`h-5 w-5 transition-colors ${active ? 'text-white' : 'text-gray-600 group-hover:text-[#26c66e]'}`} />
              <span className={`text-xs font-medium ${active ? 'text-white' : 'hidden'}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
