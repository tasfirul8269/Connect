import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Grid3X3, Users, Calendar, PlaySquare, Images, FileText, Store, AtSign } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { profilesService } from '../../services';

const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => {
  const { pathname } = useLocation();
  const active = pathname === to || pathname.startsWith(to + '/');
  return (
    <Link to={to} className="group block">
      <div className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors border-l-2 ${
        active
          ? 'text-[#26c66e] bg-[#e9f9f0] border-[#26c66e]'
          : 'text-gray-700 hover:bg-gray-50 border-transparent'
      }`}>
        <span className={`w-5 h-5 ${active ? 'text-[#26c66e]' : 'text-gray-500'} group-hover:text-gray-700`}>{icon}</span>
        <span className="font-medium">{label}</span>
      </div>
    </Link>
  );
};

const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState<string>('Guest');
  const [avatar, setAvatar] = useState<string>('');
  const [handle, setHandle] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await profilesService.getCurrentProfile();
        if (cancelled) return;
        if (res.profile && (res as any).user) {
          const u = res.user;
          if ((res.profile as any).first_name) {
            const p = res.profile as any;
            setDisplayName(`${p.first_name} ${p.last_name}`.trim());
            setHandle(`@${(u.email || '').split('@')[0] || p.first_name}`);
            setAvatar(p.profile_picture || '');
          } else {
            const o = res.profile as any;
            setDisplayName(o.organization_name);
            setHandle(`@${(u.email || '').split('@')[0] || o.organization_name.replace(/\s+/g,'').toLowerCase()}`);
            setAvatar(o.logo || '');
          }
        } else {
          const name = user?.email?.split('@')[0] || 'Guest';
          setDisplayName(name);
          setHandle(`@${name}`);
        }
      } catch {
        const name = user?.email?.split('@')[0] || 'Guest';
        setDisplayName(name);
        setHandle(`@${name}`);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <aside className="fixed top-16 bottom-0 left-0 w-64 bg-white border-r border-gray-200 overflow-y-auto">
      {/* Profile card */}
      <div className="p-4">
        <div className="border border-gray-200 rounded-xl p-3 flex items-center gap-3 shadow-sm/10">
          <img
            src={avatar || `https://i.pravatar.cc/64?u=${user?.id || 'guest'}`}
            alt="avatar"
            className="h-10 w-10 rounded-full object-cover"
          />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{displayName}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
              <AtSign className="w-3.5 h-3.5" /> {handle}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="px-4">
        <nav className="space-y-1">
          <NavItem to="/feed" icon={<Grid3X3 className="w-5 h-5" />} label="Feed" />
          <NavItem to="/friends" icon={<Users className="w-5 h-5" />} label="Friends" />
          <NavItem to="/events" icon={<Calendar className="w-5 h-5" />} label="Event" />
          <NavItem to="/videos" icon={<PlaySquare className="w-5 h-5" />} label="Watch Videos" />
          <NavItem to="/photos" icon={<Images className="w-5 h-5" />} label="Photos" />
          <NavItem to="/files" icon={<FileText className="w-5 h-5" />} label="Files" />
          <NavItem to="/marketplace" icon={<Store className="w-5 h-5" />} label="Marketplace" />
        </nav>
      </div>

      {/* Pages you like */}
      <div className="px-4 pt-4">
        <h4 className="text-xs font-semibold text-gray-500 tracking-wider mb-3">PAGES YOU LIKE</h4>
        <ul className="space-y-3">
          <li className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-[#26c66e] text-white text-sm font-bold grid place-items-center">FF</span>
              <span className="text-gray-800">Football FC</span>
            </div>
            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">120</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-purple-500 text-white text-sm font-bold grid place-items-center">BC</span>
            <span className="text-gray-800">Badminton Club</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-sky-500 text-white text-sm font-bold grid place-items-center">UI</span>
            <span className="text-gray-800">UI/UX Community</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-pink-400 text-white text-sm font-bold grid place-items-center">WD</span>
            <span className="text-gray-800">Web Designer</span>
          </li>
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;
