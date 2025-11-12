import { useMemo } from 'react';
import type { Post } from '../services/posts';

export type ExtendedProfile = {
  handle?: string;
  nickname?: string;
  bio?: string;
  cover_photo?: string;
  profile_picture?: string;
  website?: string;
  lives_in?: string;
  hometown?: string;
  education?: {
    school?: string;
    college?: string;
    university?: string;
    year_batch?: string;
    department?: string;
  };
  work?: {
    workplace?: string;
    role?: string;
    previous?: string;
  };
  socials?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  interests?: string[];
  skills?: string[];
  relationship_status?: string;
};

export type Completion = { percent: number; missing: string[] };

export function readExtendedProfile(userId: string | undefined): ExtendedProfile {
  if (!userId) return {};
  try {
    const raw = localStorage.getItem(`extended_profile_${userId}`);
    return raw ? JSON.parse(raw) as ExtendedProfile : {};
  } catch {
    return {};
  }
}

export function writeExtendedProfile(userId: string | undefined, data: ExtendedProfile) {
  if (!userId) return;
  localStorage.setItem(`extended_profile_${userId}`, JSON.stringify(data));
}

export function computeCompletion(args: {
  base: any; // backend profile (personal)
  ext: ExtendedProfile;
}): Completion {
  const { base, ext } = args;
  const checks: [string, any][] = [
    ['Profile Photo', ext.profile_picture],
    ['Cover Photo', ext.cover_photo],
    ['Username / Handle', ext.handle],
    ['Full Name', base?.first_name && base?.last_name],
    ['Bio / About Me', ext.bio || base?.bio],
    ['Date of Birth', base?.date_of_birth],
    ['Gender', base?.gender],
    ['Email', true],
    ['Phone Number', base?.phone_number],
    ['Website / Portfolio', ext.website || base?.website || ext.socials?.website],
    ['Lives In', ext.lives_in],
    ['From / Hometown', ext.hometown],
    ['School', ext.education?.school],
    ['College', ext.education?.college],
    ['University', ext.education?.university],
    ['Year / Batch', ext.education?.year_batch],
    ['Department / Field of Study', ext.education?.department],
    ['Works At', ext.work?.workplace],
    ['Position / Role', ext.work?.role],
    ['Facebook', ext.socials?.facebook],
    ['Instagram', ext.socials?.instagram],
    ['LinkedIn', ext.socials?.linkedin],
    ['GitHub', ext.socials?.github],
    ['Interests', ext.interests && ext.interests.length > 0],
    ['Skills', ext.skills && ext.skills.length > 0],
  ];
  const total = checks.length;
  const done = checks.filter(([,v]) => !!v).length;
  const missing = checks.filter(([,v]) => !v).map(([k]) => k);
  return { percent: Math.round((done/total)*100), missing };
}

export function useMediaFromPosts(posts: Post[]) {
  return useMemo(() => {
    const photos: string[] = [];
    const videos: string[] = [];
    for (const p of posts) {
      if (Array.isArray(p.media)) {
        for (const m of p.media) {
          if (m.type === 'image') photos.push(m.url);
          if (m.type === 'video') videos.push(m.url);
        }
      } else {
        if (p.image_url) photos.push(p.image_url);
        if (p.video_url) videos.push(p.video_url);
      }
    }
    return { photos, videos };
  }, [posts]);
}
