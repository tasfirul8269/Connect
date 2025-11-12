import React from 'react';
import { Mail, Phone, Globe } from 'lucide-react';

interface ContactCardProps {
  email?: string;
  phone?: string;
  website?: string;
}

const ContactCard: React.FC<ContactCardProps> = ({ email, phone, website }) => {
  if (!email && !phone && !website) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <h3 className="font-bold text-lg mb-3">Contact</h3>
      <div className="space-y-3 text-sm">
        {email && (
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-gray-500" />
            <a href={`mailto:${email}`} className="text-blue-600 hover:underline">{email}</a>
          </div>
        )}
        {phone && (
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-gray-500" />
            <span>{phone}</span>
          </div>
        )}
        {website && (
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-gray-500" />
            <a href={website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{website}</a>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactCard;
