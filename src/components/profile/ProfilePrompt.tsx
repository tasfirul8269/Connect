import React from 'react';

const ProfilePrompt: React.FC<{ open: boolean; onComplete: ()=>void; onSkip: ()=>void }>= ({ open, onComplete, onSkip }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={onSkip}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={e=>e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900">Complete Your Profile</h3>
        <p className="mt-2 text-sm text-gray-600">Add photo, education, and social links to unlock full features.</p>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button onClick={onSkip} className="px-4 py-2 rounded-md border">Skip for now</button>
          <button onClick={onComplete} className="px-4 py-2 rounded-md bg-[#26c66e] text-white">Complete now</button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePrompt;
