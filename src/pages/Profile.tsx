import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navigation from '../components/Navigation';
import { profilesService, postsService } from '../services';
import { PersonalProfile, OrganizationProfile, Post } from '../types';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PersonalProfile | OrganizationProfile | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'about'>('posts');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;

      try {
        // Fetch profile data
        const profileData = await profilesService.getCurrentProfile();
        setProfile(profileData.profile);

        // Fetch user posts
        const postsData = await postsService.getUserPosts(user.id);
        setUserPosts(postsData);
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-primary-500 rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-600 text-lg font-medium">Profile not found</p>
          </div>
        </div>
      </div>
    );
  }

  const isPersonal = 'first_name' in profile;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="bg-white border-b border-gray-200">
        <div className="h-48 bg-gradient-to-r from-primary-500 to-secondary-500 relative">
          <div className="absolute inset-0 bg-black bg-opacity-10"></div>
        </div>
        <div className="max-w-4xl mx-auto px-5 pb-6">
          <div className="flex flex-col md:flex-row items-start md:items-end space-y-4 md:space-y-0 md:space-x-6 -mt-20">
            <div className="w-32 h-32 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white font-bold text-4xl border-4 border-white shadow-lg">
              {isPersonal ? (
                <span>{profile.first_name.charAt(0)}{profile.last_name.charAt(0)}</span>
              ) : (
                <span>{profile.organization_name.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {isPersonal 
                  ? `${profile.first_name} ${profile.last_name}`
                  : profile.organization_name
                }
              </h1>
              {isPersonal && profile.bio && (
                <p className="text-gray-600 text-lg leading-relaxed mb-4">{profile.bio}</p>
              )}
              {!isPersonal && profile.description && (
                <p className="text-gray-600 text-lg leading-relaxed mb-4">{profile.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                {isPersonal ? (
                  <>
                    {profile.location && (
                      <span className="flex items-center text-gray-600">📍 {profile.location}</span>
                    )}
                    {profile.website && (
                      <a href={profile.website} className="flex items-center text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer">
                        🌐 Website
                      </a>
                    )}
                  </>
                ) : (
                  <>
                    {profile.location && (
                      <span className="flex items-center text-gray-600">📍 {profile.location}</span>
                    )}
                    {profile.industry && (
                      <span className="flex items-center text-gray-600">🏢 {profile.industry}</span>
                    )}
                    {profile.founded_year && (
                      <span className="flex items-center text-gray-600">📅 Founded {profile.founded_year}</span>
                    )}
                    {profile.website && (
                      <a href={profile.website} className="flex items-center text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer">
                        🌐 Website
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-5">
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`px-6 py-3 font-semibold text-sm border-b-3 transition-colors ${
              activeTab === 'posts' 
                ? 'text-primary-600 border-primary-600' 
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('posts')}
          >
            Posts
          </button>
          <button
            className={`px-6 py-3 font-semibold text-sm border-b-3 transition-colors ${
              activeTab === 'about' 
                ? 'text-primary-600 border-primary-600' 
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('about')}
          >
            About
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          {activeTab === 'posts' && (
            <div>
              {userPosts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No posts yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userPosts.map((post) => (
                    <div key={post.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="mb-3">
                        <p className="text-gray-800 leading-relaxed">{post.content}</p>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                        <span className="text-sm text-gray-500">{formatTimeAgo(post.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'about' && (
            <div>
              {isPersonal ? (
                <div className="space-y-8">
                  <div className="border-b border-gray-200 pb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {profile.date_of_birth && (
                        <div className="flex flex-col space-y-1">
                          <span className="text-sm font-medium text-gray-600">Date of Birth</span>
                          <span className="text-gray-900">
                            {new Date(profile.date_of_birth).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {profile.location && (
                        <div className="flex flex-col space-y-1">
                          <span className="text-sm font-medium text-gray-600">Location</span>
                          <span className="text-gray-900">{profile.location}</span>
                        </div>
                      )}
                      {profile.website && (
                        <div className="flex flex-col space-y-1">
                          <span className="text-sm font-medium text-gray-600">Website</span>
                          <a href={profile.website} className="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer">
                            {profile.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  {profile.bio && (
                    <div className="border-b border-gray-200 pb-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">About</h3>
                      <p className="text-gray-800 leading-relaxed">{profile.bio}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="border-b border-gray-200 pb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Organization Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {profile.industry && (
                        <div className="flex flex-col space-y-1">
                          <span className="text-sm font-medium text-gray-600">Industry</span>
                          <span className="text-gray-900">{profile.industry}</span>
                        </div>
                      )}
                      {profile.founded_year && (
                        <div className="flex flex-col space-y-1">
                          <span className="text-sm font-medium text-gray-600">Founded</span>
                          <span className="text-gray-900">{profile.founded_year}</span>
                        </div>
                      )}
                      {profile.location && (
                        <div className="flex flex-col space-y-1">
                          <span className="text-sm font-medium text-gray-600">Location</span>
                          <span className="text-gray-900">{profile.location}</span>
                        </div>
                      )}
                      {profile.website && (
                        <div className="flex flex-col space-y-1">
                          <span className="text-sm font-medium text-gray-600">Website</span>
                          <a href={profile.website} className="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer">
                            {profile.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  {profile.description && (
                    <div className="border-b border-gray-200 pb-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">About</h3>
                      <p className="text-gray-800 leading-relaxed">{profile.description}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
