import React, { useEffect, useState } from 'react';
import { AtSign } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { profilesService } from '../../services';

const ProfileCard: React.FC = () => {
  const { user } = useAuth();
  const emailName = user?.email?.split('@')[0] || 'user';
  const prettified = emailName
    .split(/[._-]/)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
  const [displayName, setDisplayName] = useState<string>(prettified);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await profilesService.getCurrentProfile();
        if (cancelled) return;
        if (res.profile && 'first_name' in res.profile) {
          const p: any = res.profile;
          const full = `${p.first_name || ''} ${p.last_name || ''}`.trim();
          if (full) setDisplayName(full);
        }
      } catch {}
    };
    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  return (
    <aside className="space-y-6">
      <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-200 bg-white">
        {/* Cover */}
        <div className="h-24 w-full bg-gray-200">
          <img src="https://picsum.photos/600/120" alt="cover" className="w-full h-24 object-cover" />
        </div>
        <div className="p-4">
          <div className="flex items-center -mt-8 mb-2">
            <div className="h-16 w-16 rounded-full ring-4 ring-white bg-[#26c66e] grid place-items-center text-white font-bold">{(displayName || prettified).charAt(0).toUpperCase()}</div>
            <div className="ml-auto mt-4">
              <button className="px-3 py-1.5 rounded-full bg-[#e9f4ff] text-[#1d77ff] text-xs font-semibold hover:bg-[#dcedff]">View profile</button>
            </div>
          </div>
          <p className="font-semibold text-gray-900 leading-tight">{displayName}</p>
          <p className="text-xs text-gray-500 mb-3 flex items-center gap-1"><AtSign className="w-3.5 h-3.5" /> @{emailName}</p>
          <p className="text-xs text-gray-600 mb-3">Building Websites and Webapps with Seamless User Experience Across Devices.</p>
          <div className="flex items-center gap-6 text-sm">
            <div><span className="font-semibold text-gray-900">238</span> <span className="text-gray-500">Friends</span></div>
            <div><span className="font-semibold text-gray-900">84</span> <span className="text-gray-500">Organizations</span></div>
          </div>
          <div className="mt-4 space-y-2 text-xs">
            <a href="#" className="text-[#1d77ff] hover:underline">{emailName}.example.com</a>
            <div className="text-gray-500 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z"/></svg>
              Dhaka, Bangladesh
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default ProfileCard;
