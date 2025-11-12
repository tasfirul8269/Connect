import React from 'react';
import { Briefcase, GraduationCap, MapPin, Home, Heart, Calendar } from 'lucide-react';

interface IntroCardProps {
  bio?: string;
  workplace?: string;
  role?: string;
  school?: string;
  lives_in?: string;
  hometown?: string;
  relationship_status?: string;
  gender?: string;
  date_of_birth?: string;
}

const IntroCard: React.FC<IntroCardProps> = ({ bio, workplace, role, school, lives_in, hometown, relationship_status, gender, date_of_birth }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <h3 className="font-bold text-lg mb-2">Intro</h3>
      {bio && <h3 className="text-center font-medium text-sm text-gray-600 mb-4">❝ {bio} ❞</h3>}
      
      <div className="space-y-3 text-sm">
        {workplace && (
          <div className="flex items-center gap-3">
            <Briefcase className="w-5 h-5 text-gray-500" />
            <span>{role ? `${role} at ` : 'Works at '}<strong>{workplace}</strong></span>
          </div>
        )}
        {school && (
          <div className="flex items-center gap-3">
            <GraduationCap className="w-5 h-5 text-gray-500" />
            <span>Studied at <strong>{school}</strong></span>
          </div>
        )}
        {lives_in && (
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-gray-500" />
            <span>Lives in <strong>{lives_in}</strong></span>
          </div>
        )}
        {hometown && (
          <div className="flex items-center gap-3">
            <Home className="w-5 h-5 text-gray-500" />
            <span>From <strong>{hometown}</strong></span>
          </div>
        )}
        {relationship_status && (
          <div className="flex items-center gap-3">
            <Heart className="w-5 h-5 text-gray-500" />
            <span>{relationship_status}</span>
          </div>
        )}
        {gender && (
          <div className="flex items-center gap-3">
            <Heart className="w-5 h-5 text-gray-500" />
            <span className='capitalize'>{gender}</span>
          </div>
        )}
        {date_of_birth && (
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span>Born on <strong>{new Date(date_of_birth).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</strong></span>
          </div>
        )}
      </div>

      <button className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-sm font-medium py-2 rounded-lg">
        Edit details
      </button>
      <button className="mt-2 w-full bg-gray-100 hover:bg-gray-200 text-sm font-medium py-2 rounded-lg">
        Add featured
      </button>
    </div>
  );
};

export default IntroCard;
