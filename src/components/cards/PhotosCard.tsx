import React from 'react';

interface PhotosCardProps {
  photos: { url: string; alt: string }[];
}

const PhotosCard: React.FC<PhotosCardProps> = ({ photos }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-lg">Photos</h3>
        <a href="#" className="text-sm text-blue-600 hover:underline">See All Photos</a>
      </div>
      <div className="grid grid-cols-3 gap-2 rounded-lg overflow-hidden">
        {photos.slice(0, 9).map((photo, index) => (
          <img key={index} src={photo.url} alt={photo.alt} className="aspect-square object-cover w-full h-full" />
        ))}
      </div>
    </div>
  );
};

export default PhotosCard;
