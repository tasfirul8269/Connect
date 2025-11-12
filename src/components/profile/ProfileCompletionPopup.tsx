import React from 'react';
import { X, Sparkles } from 'lucide-react';

interface ProfileCompletionPopupProps {
  isOpen: boolean;
  onCompleteNow: () => void;
  onSkip: () => void;
  profilePercent?: number;
}

const ProfileCompletionPopup: React.FC<ProfileCompletionPopupProps> = ({ 
  isOpen, 
  onCompleteNow, 
  onSkip,
  profilePercent = 0
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#26c66e] to-emerald-400 px-6 py-8 text-white relative">
          <button
            onClick={onSkip}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8" />
            <h2 className="text-2xl font-bold">Welcome! 🎉</h2>
          </div>
          <p className="text-white/90">Let's complete your profile to help you connect better</p>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Profile Completion</span>
              <span className="text-sm font-bold text-[#26c66e]">{profilePercent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-[#26c66e] to-emerald-400 h-3 rounded-full transition-all duration-500" 
                style={{ width: `${profilePercent}%` }}
              ></div>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3 text-sm text-gray-700">
              <span className="text-[#26c66e]">✓</span>
              <p>Add profile photo to make your account recognizable</p>
            </div>
            <div className="flex items-start gap-3 text-sm text-gray-700">
              <span className="text-[#26c66e]">✓</span>
              <p>Complete your education & work details</p>
            </div>
            <div className="flex items-start gap-3 text-sm text-gray-700">
              <span className="text-[#26c66e]">✓</span>
              <p>Add interests & skills to find like-minded people</p>
            </div>
            <div className="flex items-start gap-3 text-sm text-gray-700">
              <span className="text-[#26c66e]">✓</span>
              <p>Connect social links for better networking</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={onCompleteNow}
              className="w-full bg-[#26c66e] text-white py-3 rounded-lg font-semibold hover:bg-[#20a859] transition-colors"
            >
              Complete Now
            </button>
            <button
              onClick={onSkip}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Skip for Now
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            You can complete your profile anytime from your profile page
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileCompletionPopup;
