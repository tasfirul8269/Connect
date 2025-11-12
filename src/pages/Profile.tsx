import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Layout } from "../components/layout";
import { ProfileWizard } from "../components/profile";
import { PostCard } from "../components/posts";
import {
  IntroCard,
  ContactCard,
  SocialLinksCard,
  PhotosCard,
  FriendsCard,
} from "../components/cards";
import { profilesService, postsService } from "../services";
import type { Post, Comment } from "../services/posts";
import { PersonalProfile, OrganizationProfile } from "../types";
import {
  readExtendedProfile,
  writeExtendedProfile,
  computeCompletion,
  useMediaFromPosts,
} from "../utils/profile";
import {
  Edit3,
  Camera,
  MoreHorizontal,
  ImagePlus,
  Smile,
  Video,
  Paperclip,
  Users,
  Grid,
  List,
  MapPin,
  Link,
  CalendarDays,
  Plus,
  Layers,
  Search,
  MoreVertical,
  MoreHorizontalIcon,
} from "lucide-react";
import { uploadToS3 } from "../services/aws";
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<
    PersonalProfile | OrganizationProfile | null
  >(null);
  const [showProfilePicMenu, setShowProfilePicMenu] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [mediaItems, setMediaItems] = useState<Array<{ 
    url: string; 
    type: string; 
    id?: number; 
    created_at?: string;
    source?: 'post' | 'profile_picture';
  }>>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [activeMediaTab, setActiveMediaTab] = useState<'all' | 'profile_pictures'>('all');
  // Crop functionality state
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{x: number; y: number; width: number; height: number} | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const profilePicInputRef = React.useRef<HTMLInputElement>(null);
  
  // Handle crop area changes
  const onCropChange = (location: { x: number; y: number }) => {
    setCrop(location);
  };
  
  // Handle zoom changes
  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };
  
  // Handle crop completion
  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSaveCroppedImage = async () => {
    if (!croppedImage || !user?.id || !profile) return;
    
    try {
      // 1. Convert data URL to blob
      const response = await fetch(croppedImage);
      const blob = await response.blob();
      const file = new File([blob], 'profile-picture.jpg', { type: 'image/jpeg' });
      
      // 2. Upload the cropped image to S3
      const imageUrl = await uploadToS3(file);
      
      // 3. Update the profile with the new picture
      if ('profile_picture' in profile) {
        // For personal profiles
        try {
          // First get the current profile to preserve all fields
          const currentProfile = await profilesService.getProfileDetails(profile.user_id);
          
          // Create update object with all current fields and new profile picture
          const updateData = {
            ...currentProfile,
            profile_picture: imageUrl,
            profile_photo: imageUrl
          };
          
          // Update the profile
          await profilesService.updateProfileDetails(updateData);
          
          // Update local state to reflect the change
          setProfile(prev => prev ? { ...prev, profile_picture: imageUrl } : null);
          
        } catch (error) {
          console.error('Error getting profile details:', error);
          // Fallback to minimal update if getting full profile fails
          await profilesService.updateProfileDetails({
            profile_picture: imageUrl,
            profile_photo: imageUrl
          });
        }
      } else if ('logo' in profile && profile.user_id) {
        // For organization profiles
        const orgProfile = await profilesService.getProfile(profile.user_id);
        if (orgProfile && orgProfile.profile) {
          await profilesService.updateOrganizationProfile(profile.user_id, {
            ...orgProfile.profile, // Keep all existing fields
            logo: imageUrl
          });
        } else {
          // Fallback in case getProfile fails
          await profilesService.updateOrganizationProfile(profile.user_id, {
            logo: imageUrl
          });
        }
      }
      
      // Update the local profile state
      setProfile({
        ...profile,
        ...('profile_picture' in profile 
          ? { profile_picture: imageUrl, profile_photo: imageUrl }
          : { logo: imageUrl })
      });
      
      // Save profile picture history
      await profilesService.saveProfilePictureHistory(user.id, imageUrl);
      
      // 4. Refresh the media gallery to show the new picture
      if (showMediaGallery) {
        fetchMediaItems();
      }
      
      // 5. Close modals and reset state
      setShowCropModal(false);
      setShowMediaGallery(false);
      
      // 6. Show success message
      alert('Profile picture updated successfully!');
      
    } catch (error) {
      console.error('Error updating profile picture:', error);
      alert('Failed to update profile picture. Please try again.');
    } finally {
      // Reset crop state
      setCroppedImage(null);
      setSelectedImage(null);
      setCroppedAreaPixels(null);
    }
  };

  useEffect(() => {
    const cropImage = async () => {
      if (!selectedImage || !croppedAreaPixels) return;
      
      try {
        const cropped = await getCroppedImg(selectedImage, croppedAreaPixels);
        setCroppedImage(cropped);
      } catch (e) {
        console.error('Error cropping image:', e);
      }
    };
    
    if (selectedImage && croppedAreaPixels) {
      cropImage();
    }
  }, [selectedImage, croppedAreaPixels]);

  // Fetch user's media (post images and previous profile pictures)
  useEffect(() => {
    const fetchMedia = async () => {
      if (!showMediaGallery || !user?.id || !profile) return;
      
      setIsLoadingMedia(true);
      try {
        // Fetch user's posts with media
        const posts = await postsService.getUserPosts(user.id);
        
        // Extract all media URLs from posts
        const mediaFromPosts = posts.flatMap(post => {
          const media: {url: string, type: 'image' | 'video' | 'audio'}[] = [];
          
          // Add main post media if it exists
          if (post.media_type === 'image' && post.image_url) {
            media.push({ url: post.image_url, type: 'image' });
          } else if (post.media_type === 'video' && post.video_url) {
            media.push({ url: post.video_url, type: 'video' });
          }
          
          // Add media from the media array if it exists
          if (post.media && Array.isArray(post.media)) {
            post.media.forEach(item => {
              if (item.url) {
                media.push({ url: item.url, type: item.type });
              }
            });
          }
          
          return media;
        });
        
        // Add current profile picture if it exists
        const currentProfilePic = 'profile_picture' in profile ? profile.profile_picture : 
                                'logo' in profile ? profile.logo : undefined;
        
        if (currentProfilePic) {
          mediaFromPosts.unshift({ url: currentProfilePic, type: 'image' });
        }
        
        // Remove duplicates based on URL
        const uniqueMedia = mediaFromPosts.filter(
          (item, index, self) => 
            index === self.findIndex(t => t.url === item.url)
        );
        
        setMediaItems(uniqueMedia);
        
      } catch (error) {
        console.error('Error fetching media:', error);
        // Fallback to empty array if there's an error
        setMediaItems([]);
      } finally {
        setIsLoadingMedia(false);
      }
    };

    fetchMedia();
  }, [showMediaGallery, user?.id, profile]);

  // Fetch media for gallery (posts + profile picture history)
  const fetchMediaItems = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoadingMedia(true);
    try {
      // Fetch both posts and profile picture history in parallel
      const [posts, profilePictures] = await Promise.all([
        postsService.getUserPosts(user.id).catch(() => []),
        profilesService.getProfilePictureHistory(user.id).catch(() => [])
      ]);
      
      // Process post media - only include images
      const postMedia = (posts || []).flatMap((post: any) => 
        (post.media || [])
          .filter((m: any) => m.type === 'image') // Only include images
          .map((m: any) => ({
            url: m.url,
            type: 'image' as const,
            source: 'post' as const
          }))
      );
      
      // Process profile picture history - these are always images
      const profilePicMedia = (profilePictures || []).map((pic: any) => ({
        url: pic.image_url,
        type: 'image' as const,
        id: pic.id,
        created_at: pic.created_at,
        source: 'profile_picture' as const
      }));
      
      // Combine and deduplicate by URL
      const combined = [...profilePicMedia, ...postMedia];
      const uniqueMedia = Array.from(new Map(combined.map(item => [item.url, item])).values());
      
      setMediaItems(uniqueMedia);
    } catch (error) {
      console.error('Error fetching media items:', error);
    } finally {
      setIsLoadingMedia(false);
    }
  }, [user?.id]);

  // Load media when the gallery is opened or tab changes
  useEffect(() => {
    if (showMediaGallery) {
      fetchMediaItems();
    }
  }, [showMediaGallery, fetchMediaItems]);

  type UIPost = Post & {
    saved?: boolean;
    commentDraft?: string;
    showComments?: boolean;
    showOneComment?: boolean;
    comments?: Comment[];
  };
  const [userPosts, setUserPosts] = useState<UIPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("timeline");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [commentModalFor, setCommentModalFor] = useState<string | null>(null);
  const [newPost, setNewPost] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;
      try {
        const profileData = await profilesService.getCurrentProfile();
        setProfile(profileData.profile);

        // Fetch extended profile from backend
        const extendedData = await profilesService.getExtendedProfile(user.id);
        if (extendedData) {
          // Store in localStorage as cache (for backward compatibility)
          writeExtendedProfile(user.id, extendedData);
        } else {
          // Try to migrate from localStorage to backend
          const localExt = readExtendedProfile(user.id);
          if (localExt && Object.keys(localExt).length > 0) {
            try {
              await profilesService.updateExtendedProfile(localExt);
            } catch (error) {
              console.error("Error migrating extended profile:", error);
            }
          }
        }

        const postsData = await postsService.getUserPosts(user.id);
        const savedSet = new Set<string>(
          JSON.parse(
            localStorage.getItem(`saved_posts_${user?.id || "guest"}`) || "[]",
          ),
        );
        const mapped: UIPost[] = postsData.map((p) => ({
          ...p,
          saved: savedSet.has(p.id),
          commentDraft: "",
          showOneComment: true,
        }));
        setUserPosts(mapped);
        const toPrefetch = postsData
          .filter((p) => (p.comments_count || 0) > 0)
          .slice(0, 5);
        for (const p of toPrefetch) {
          try {
            const cs = await postsService.getComments(p.id);
            setUserPosts((prev) =>
              prev.map((pp) =>
                pp.id === p.id ? { ...pp, comments: cs.slice(0, 1) } : pp,
              ),
            );
          } catch {}
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, [user]);

  const handleUpdatePost = (postId: string, updates: Partial<UIPost>) => {
    setUserPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, ...updates } : p)),
    );
  };

  const handleOpenCommentModal = async (postId: string) => {
    try {
      const post = userPosts.find((p) => p.id === postId);
      if (
        !post?.comments ||
        post.comments.length < (post.comments_count || 0)
      ) {
        const all = await postsService.getComments(postId);
        setUserPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, comments: all } : p)),
        );
      }
      setCommentModalFor(postId);
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  // IMPORTANT: Call hooks before any conditional returns
  const media = useMediaFromPosts(userPosts);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() && files.length === 0) return;

    setIsSubmitting(true);
    try {
      let payload: any = { content: newPost || undefined };
      if (files.length > 0) {
        const uploaded = [] as {
          url: string;
          type: "image" | "video" | "audio";
        }[];
        for (const f of files) {
          const url = await uploadToS3(f);
          const mime = f.type;
          const type = mime.startsWith("video/")
            ? "video"
            : mime.startsWith("audio/")
              ? "audio"
              : "image";
          uploaded.push({ url, type });
        }
        payload.media = uploaded;
        payload.media_type = uploaded.length > 1 ? "mixed" : uploaded[0].type;
        const first = uploaded[0];
        if (first.type === "image") payload.image_url = first.url;
        if (first.type === "video") payload.video_url = first.url;
        if (first.type === "audio") payload.audio_url = first.url;
      }
      const created = await postsService.createPost(payload);
      setUserPosts((prev) => [created, ...prev]);
      setNewPost("");
      setFiles([]);
      setPreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Error creating post:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-primary-500 rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Loading profile...</p>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-600 text-lg font-medium">
              Profile not found
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const isPersonal = "first_name" in profile;
  const ext = readExtendedProfile(user?.id);

  const coverUrl =
    ext.cover_photo ||
    "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&h=300&fit=crop";
  const avatarUrl =
    ext.profile_picture ||
    `https://i.pravatar.cc/200?u=${user?.id || "placeholder"}`;

  return (
    <Layout>
      <div className="bg-gray-100">
        <div className="bg-white shadow-sm rounded-2xl overflow-hidden">
          {/* Cover Photo */}
          <div className="relative h-56 md:h-64 bg-gray-200">
            <img
              src={coverUrl}
              alt="Cover"
              className="w-full h-full object-cover"
            />
            {/* <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white to-transparent pointer-events-none"></div> */}
          </div>

          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            {/* Profile Info */}
            <div className=" -mt-16 sm:-mt-20 relative z-10">
              <div className="flex items-end justify-between gap-2">
                <div className="relative">
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 border-white bg-white object-cover"
                  />
                  <div className="relative">
                    <button 
                      className="absolute bottom-2 right-0 bg-white hover:bg-gray-100 text-gray-700 p-2 rounded-full border-2 border-white shadow-sm hover:shadow transition-all duration-200 z-10"
                      onClick={() => setShowProfilePicMenu(!showProfilePicMenu)}
                      title="Change profile picture"
                      type="button"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    
                    {showProfilePicMenu && (
                      <div className="absolute left-full -top-3 -ml-8 w-48 bg-white rounded-xl shadow-lg py-2 z-20 border border-gray-100">
                        <button
                          onClick={() => {
                            profilePicInputRef.current?.click();
                            setShowProfilePicMenu(false);
                          }}
                          className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                          type="button"
                        >
                          <ImagePlus className="w-4 h-4 mr-3 text-gray-500" />
                          <span>Choose from device</span>
                        </button>
                        <div className="h-px bg-gray-100 my-1"></div>
                        <button
                          onClick={() => {
                            setShowMediaGallery(true);
                            setShowProfilePicMenu(false);
                          }}
                          className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                          type="button"
                        >
                          <Layers className="w-4 h-4 mr-3 text-gray-500" />
                          <span>Choose from media</span>
                        </button>
                      </div>
                    )}
                    
                    <input
                      type="file"
                      ref={profilePicInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !user?.id) return;
                        
                        try {
                          setShowProfilePicMenu(false);
                          
                          // 1. Create a preview URL for the selected image
                          const imageUrl = URL.createObjectURL(file);
                          
                          // 2. Show crop modal with the selected image
                          setSelectedImage(imageUrl);
                          setShowCropModal(true);
                          
                        } catch (error) {
                          console.error('Error processing image:', error);
                          alert('Failed to process the selected image. Please try again.');
                        } finally {
                          // Reset the file input
                          if (e.target) {
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setWizardOpen(true)}
                    className="flex mb-3 items-center justify-center gap-2 bg-[#26c66e] hover:bg-[#26c66e]/80 text-white text-sm py-2 px-4 font-medium rounded-xl"
                  >
                    <Plus className="w-4 h-4" />
                    Create Highlight
                  </button>
                  <button
                    onClick={() => setWizardOpen(true)}
                    className="flex mb-3 items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-600 text-sm py-2 px-4 font-medium rounded-xl"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                </div>
              </div>
              <div className="pt-0 sm:pt-2 pb-2 flex-grow">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {isPersonal
                    ? `${profile.first_name} ${profile.last_name}`
                    : profile.organization_name}
                </h1>
                <p className="text-[20px] text-gray-500">
                  @{ext.handle || user?.email?.split("@")[0]}
                </p>
                {/* Stats */}
                <div className="flex mt-2 items-center gap-4 text-sm">
                  <a href="#" className="hover:underline">
                    <span className="font-bold text-gray-800">52</span>{" "}
                    <span className="font-medium text-gray-500">Following</span>
                  </a>
                  <a href="#" className="hover:underline">
                    <span className="font-bold text-gray-800">14</span>{" "}
                    <span className="font-medium text-gray-500">Followers</span>
                  </a>
                </div>
                <p className="text-sm mt-4 font-medium text-gray-500">
                  {ext.bio || ""}
                </p>
              </div>
            </div>

            {/* Sub-navigation and Actions */}
            <div className="mt-4 flex flex-col sm:flex-row justify-between items-center border-t border-gray-200 pt-2">
              {/* Tabs */}
              <nav className="-mb-px flex gap-1">
                {(
                  [
                    "Timeline",
                    "About",
                    "Friends",
                    "Organizations",
                    "Media",
                  ] as const
                ).map((tab) => {
                  const isActive = activeTab === tab.toLowerCase();
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab.toLowerCase())}
                      className={`px-4 py-3 text-sm font-medium relative transition-colors duration-150 ${
                        isActive
                          ? "text-[#26c66e]"
                          : "text-gray-600 hover:text-gray-800"
                      }`}
                    >
                      {tab}
                      <span
                        className={`absolute bottom-0 left-0 right-0 h-[3px] bg-[#26c66e] transform transition-transform duration-200 ${
                          isActive ? "scale-x-100" : "scale-x-0"
                        }`}
                      />
                    </button>
                  );
                })}
              </nav>

              <div className="flex items-center gap-4 mt-2 sm:mt-0">
                {/* Action Buttons */}
                {user && (profile as any).user_id === user.id && (
                  <div className="flex items-center gap-2 border-l border-gray-300 pl-4">
                    
                     <button className="p-2 bg-[#e9f9f0] hover:bg-[#dff5ea] text-[#26c66e] rounded-full ">
                      <Search className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setWizardOpen(true)}
                      className="p-2 bg-gray-200 text-gray-800 rounded-full hover:bg-gray-300"
                    >
                      <MoreHorizontalIcon className="w-4 h-4" />
                    </button>
                   
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === "timeline" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Column */}
            <div className="hidden lg:block lg:col-span-2">
              <div className="sticky top-4 space-y-6 max-h-[calc(100vh-2rem)] overflow-y-auto no-scrollbar">
                <div className="space-y-6">
                  <IntroCard
                    bio={ext.bio}
                    workplace={ext.work?.workplace}
                    role={ext.work?.role}
                    school={ext.education?.university || ext.education?.college}
                    lives_in={ext.lives_in}
                    hometown={ext.hometown}
                    relationship_status={ext.relationship_status}
                    gender={isPersonal ? profile.gender : undefined}
                    date_of_birth={
                      isPersonal ? profile.date_of_birth : undefined
                    }
                  />
                  <PhotosCard
                    photos={media.photos.map((p) => ({ url: p, alt: "photo" }))}
                  />
                  <FriendsCard />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-3 space-y-6">
              {/* Create Post */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <h3 className="font-bold text-lg mb-3">Create Post</h3>
                <form onSubmit={handleCreatePost}>
                  <div className="flex items-start gap-3">
                    <img
                      className="h-10 w-10 rounded-full object-cover"
                      src={avatarUrl}
                      alt="me"
                    />
                    <textarea
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      placeholder={`What's on your mind, ${isPersonal ? profile.first_name : ""}?`}
                      className="flex-1 bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                    />
                  </div>

                  {previews.length > 0 && (
                    <div
                      className="mt-3 grid gap-2"
                      style={{
                        gridTemplateColumns: `repeat(${Math.min(previews.length, 4)}, 1fr)`,
                      }}
                    >
                      {previews.map((src, idx) => (
                        <div key={idx} className="relative aspect-square">
                          {files[idx]?.type.startsWith("video/") ? (
                            <video
                              src={src}
                              className="w-full h-full rounded-lg object-cover"
                              controls
                              muted
                            />
                          ) : (
                            <img
                              src={src}
                              alt="preview"
                              className="w-full h-full rounded-lg object-cover"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const list = Array.from(e.target.files || []);
                          setFiles(list);
                          setPreviews(list.map((f) => URL.createObjectURL(f)));
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2"
                      >
                        <ImagePlus className="w-5 h-5 text-green-500" />{" "}
                        <span className="hidden sm:inline">Photo/Video</span>
                      </button>
                      <button
                        type="button"
                        className="px-3 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Smile className="w-5 h-5 text-yellow-500" />{" "}
                        <span className="hidden sm:inline">Feeling</span>
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={
                        (files.length > 0 ? false : !newPost.trim()) ||
                        isSubmitting
                      }
                      className="bg-blue-500 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50"
                    >
                      {isSubmitting ? "Posting..." : "Post"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Posts Feed */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg">Posts</h3>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md flex items-center gap-2 text-sm font-medium">
                      <List className="w-4 h-4" /> Filters
                    </button>
                    <button className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md flex items-center gap-2 text-sm font-medium">
                      <Grid className="w-4 h-4" /> Manage posts
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  {userPosts.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-gray-500">No posts yet</p>
                    </div>
                  ) : (
                    userPosts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        currentUserId={user?.id}
                        onUpdatePost={handleUpdatePost}
                        onOpenCommentModal={handleOpenCommentModal}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === "about" && (
          <div className="space-y-6">
            <IntroCard
              bio={ext.bio}
              workplace={ext.work?.workplace}
              role={ext.work?.role}
              school={ext.education?.university || ext.education?.college}
              lives_in={ext.lives_in}
              hometown={ext.hometown}
              relationship_status={ext.relationship_status}
              gender={isPersonal ? profile.gender : undefined}
              date_of_birth={isPersonal ? profile.date_of_birth : undefined}
            />
            <ContactCard
              email={user?.email}
              phone={isPersonal ? profile.phone_number : undefined}
              website={ext.website}
            />
            <SocialLinksCard
              facebook={ext.socials?.facebook}
              instagram={ext.socials?.instagram}
              linkedin={ext.socials?.linkedin}
              github={ext.socials?.github}
            />
          </div>
        )}
        {activeTab === "friends" && <FriendsCard />}
        {activeTab === "media" && (
          <PhotosCard
            photos={media.photos.map((p) => ({ url: p, alt: "photo" }))}
          />
        )}
        {activeTab === "organizations" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No organizations joined yet.</p>
          </div>
        )}
      </div>

      {/* Comment Modal */}
      {commentModalFor && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
          onClick={() => setCommentModalFor(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-xl max-h-[70vh] overflow-y-auto p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Comments</h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setCommentModalFor(null)}
              >
                Close
              </button>
            </div>
            <div className="space-y-3">
              {(
                userPosts.find((p) => p.id === commentModalFor)?.comments || []
              ).map((c: Comment) => (
                <div key={c.id} className="flex gap-3 items-start">
                  <div className="h-8 w-8 rounded-full bg-gray-200" />
                  <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-full">
                    <p className="text-xs text-gray-600 font-medium">
                      {(c as any).author_name || "User"}
                    </p>
                    <p className="text-sm text-gray-800">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ProfileWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
      
      {/* Crop Image Modal */}
      {showCropModal && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Crop Profile Picture</h3>
              <button
                onClick={() => setShowCropModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <div className="relative w-full h-96">
              <Cropper
                image={selectedImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                cropShape="round"
                showGrid={false}
              />
            </div>
            
            <div className="p-4 border-t flex justify-between items-center">
              <div className="w-full px-4">
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleSaveCroppedImage();
                }}
                className="px-4 py-2 bg-[#26c66e] text-white rounded-lg hover:bg-[#1e9f59] transition-colors"
                disabled={!croppedImage}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Media Gallery Modal */}
      {showMediaGallery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Choose Profile Picture</h3>
              <button 
                onClick={() => setShowMediaGallery(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-grow">
              {isLoadingMedia ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {mediaItems
                    .filter(media => media.type === 'image') // Only show images
                    .map((media, index) => (
                      <button
                        key={index}
                        className="relative group aspect-square overflow-hidden rounded-lg hover:ring-2 hover:ring-[#26c66e] transition-all"
                        onClick={async () => {
                          try {
                            setSelectedImage(media.url);
                            setShowMediaGallery(false); // Close the media gallery
                            setShowCropModal(true);     // Open the crop modal
                          } catch (error) {
                            console.error('Error selecting image:', error);
                          }
                        }}
                      >
                        <img
                          src={media.url}
                          alt={`Image ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Handle broken images
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = '/placeholder-image.jpg'; // Fallback image
                          }}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 text-white font-medium">
                            Select
                          </span>
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setShowMediaGallery(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Profile;
