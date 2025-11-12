import React from 'react';

const RightSidebar: React.FC = () => {
  return (
    <aside className="space-y-6">
      {/* Upcoming event (creative, banner + white details) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900 text-lg">Upcoming event</h4>
          <button className="text-xs text-[#26c66e] hover:underline">View all</button>
        </div>
        <div className="rounded-2xl overflow-hidden border border-gray-200">
          <div className="relative">
            <img src="https://picsum.photos/seed/b1/600/300" alt="event" className="w-full h-32 object-cover" />
            <button className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 text-white grid place-items-center">⋯</button>
          </div>
          <div className="bg-white text-gray-900 p-3">
            <p className="text-[11px] text-gray-500">Sat, 29 Nov at 09:00</p>
            <p className="font-semibold leading-tight">DIU Job Utsob — 2025</p>
            <p className="text-xs text-gray-600 truncate">Daffodil International University, Daffodil...</p>
            <p className="text-[11px] text-gray-500 mt-1">2.3K interested • 180 going</p>
            <div className="mt-3 flex items-center gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 bg-[#e9f9f0] hover:bg-[#dff5ea] text-[#26c66e] text-sm py-2 rounded-xl">
                <span>★</span>
                Interested
              </button>
              <button className="h-10 w-10 rounded-xl border border-gray-200 hover:bg-gray-50 grid place-items-center">↗</button>
            </div>
          </div>
        </div>
      </div>

      {/* My friends (scrollable card) */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden flex flex-col h-[380px]">
        <div className="px-4 py-3 border-b font-semibold text-gray-900">My friends</div>
        <div className="flex-1 overflow-y-auto scrollable" onScroll={(e) => {
          const el = e.currentTarget; el.classList.add('scrolling');
          clearTimeout((el as any)._t);
          (el as any)._t = setTimeout(() => el.classList.remove('scrolling'), 500);
        }}>
          <ul>
            {[
              'Dustin Cooper','Amelia Shiba','Robert Hammond','Lettie Christensen','Mason Cooper','Isabel Hughes','Ethan Reynolds','Ava Thompson','Pablo Morandi','Minnie Armstrong','Russell Hicks','Pan Feng Shui'
            ].map((name, i) => (
              <li key={i} className="px-3 py-2 flex items-center hover:bg-gray-50 rounded-lg mx-2 my-1">
                <div className="relative">
                  <img src={`https://i.pravatar.cc/40?u=f${i}`} alt={name} className="h-8 w-8 rounded-full object-cover ring-2 ring-white" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-green-500 rounded-full ring-2 ring-white" />
                </div>
                <span className="ml-3 text-sm text-gray-900">{name}</span>
                <span className="ml-auto text-gray-300">›</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
};

export default RightSidebar;
