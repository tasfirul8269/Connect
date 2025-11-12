import React from 'react';

const FriendsCard: React.FC = () => {
  const friends = Array.from({ length: 20 }).map((_, i) => ({
    id: `f-${i}`,
    name: `Friend ${i + 1}`,
    handle: `@friend${i + 1}`,
    avatar: `https://i.pravatar.cc/40?u=f${i}`,
  }));

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden flex flex-col h-[400px]">
      <div className="px-4 py-3 border-b font-semibold text-gray-900">My friends</div>
<div className="overflow-y-auto scrollable" onScroll={(e) => { const el = e.currentTarget; el.classList.add('scrolling'); clearTimeout((el as any)._t); (el as any)._t = setTimeout(()=>el.classList.remove('scrolling'), 500); }}>
        <ul className="divide-y">
          {friends.map(f => (
            <li key={f.id} className="px-4 py-3 flex items-center gap-3">
              <img src={f.avatar} alt={f.name} className="h-8 w-8 rounded-full object-cover" />
              <div className="min-w-0">
                <p className="text-sm text-gray-900 truncate">{f.name}</p>
                <p className="text-[11px] text-gray-500 truncate">{f.handle}</p>
              </div>
              <button className="ml-auto text-xs text-[#26c66e] hover:underline">View</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default FriendsCard;
