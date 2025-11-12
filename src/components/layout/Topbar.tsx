import React, { useState, useRef, useEffect } from 'react';
import { Bell, Mail, Search, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Topbar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { logout } = useAuth();

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  return (
    <header className="fixed top-2 inset-x-0 z-50">
      <div className="max-w-[1200px] mx-auto h-[72px] rounded-2xl bg-white shadow-sm border border-gray-200 px-5 flex items-center">
        {/* Left: logo + search */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-8 w-10 flex items-center justify-center">
            <svg className="text-[#26c66e]" width="28" height="22" viewBox="0 0 28 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 20L8.5 4.5C9.1 3.1 10.9 3.1 11.5 4.5L18 20" fill="currentColor" />
              <rect x="0" y="14" width="6" height="6" rx="1.2" fill="currentColor" />
              <rect x="10" y="8" width="6" height="12" rx="1.2" fill="currentColor" />
              <rect x="20" y="0" width="6" height="20" rx="1.2" fill="currentColor" />
            </svg>
          </div>
          <div className="relative w-[360px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search something"
              className="w-full pl-10 pr-3 h-10 rounded-full bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#26c66e]"
            />
          </div>
        </div>

        {/* Right group: actions + profile */}
        <div className="ml-auto flex items-center gap-4">
          <nav className="flex items-center gap-2 text-gray-700">
            <button className="relative p-2 rounded-full hover:bg-gray-100" aria-label="Notifications">
              <Bell className="h-5 w-5" />
            </button>
            <button className="relative p-2 rounded-full hover:bg-gray-100" aria-label="Inbox">
              <Mail className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 text-[10px] leading-none px-1.5 py-0.5 rounded-full bg-red-500 text-white">8</span>
            </button>
          </nav>
          <div className="h-6 w-px bg-gray-200" />
          <div className="flex items-center gap-3 relative" ref={menuRef}>
            <img src={`https://i.pravatar.cc/40`} alt="profile" className="h-8 w-8 rounded-full object-cover" />
            <span className="hidden sm:block text-sm text-gray-800">Aksara Pratama M</span>
            <button onClick={() => setOpen(v=>!v)} className="p-1 rounded-full hover:bg-gray-100">
              <ChevronDown className="h-4 w-4 text-gray-600" />
            </button>
            {open && (
              <div className="absolute right-0 top-10 w-44 bg-white shadow-lg border border-gray-100 rounded-lg py-1 text-sm">
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50">Profile</button>
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50">Settings</button>
                <div className="my-1 border-t" />
                <button onClick={() => { setOpen(false); logout(); }} className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50">Logout</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
