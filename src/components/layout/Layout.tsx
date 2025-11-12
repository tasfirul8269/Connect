import React from 'react';
import Topbar from './Topbar';

const Layout: React.FC<{ children: React.ReactNode }>= ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar />
      <main className="fixed top-[84px] left-0 right-0 bottom-0 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto pt-[20px] pb-10 px-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;