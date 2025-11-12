import React from 'react';
import { Facebook, Instagram, Linkedin, Github } from 'lucide-react';

interface SocialLinksCardProps {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  github?: string;
}

const SocialLinksCard: React.FC<SocialLinksCardProps> = ({ facebook, instagram, linkedin, github }) => {
  if (!facebook && !instagram && !linkedin && !github) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <h3 className="font-bold text-lg mb-3">Socials</h3>
      <div className="space-y-2">
        {facebook && (
          <a href={facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-gray-50">
            <Facebook className="w-5 h-5 text-blue-600" />
            <span className='text-gray-700'>Facebook</span>
          </a>
        )}
        {instagram && (
          <a href={instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-gray-50">
            <Instagram className="w-5 h-5 text-pink-500" />
            <span className='text-gray-700'>Instagram</span>
          </a>
        )}
        {linkedin && (
          <a href={linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-gray-50">
            <Linkedin className="w-5 h-5 text-blue-700" />
            <span className='text-gray-700'>LinkedIn</span>
          </a>
        )}
        {github && (
          <a href={github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-gray-50">
            <Github className="w-5 h-5 text-gray-800" />
            <span className='text-gray-700'>GitHub</span>
          </a>
        )}
      </div>
    </div>
  );
};

export default SocialLinksCard;
