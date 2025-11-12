import api from './api';

export interface PostMedia { url: string; type: 'image'|'video'|'audio' }

export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  video_url?: string;
  audio_url?: string;
  media_type?: 'text' | 'image' | 'video' | 'audio' | 'mixed';
  media?: PostMedia[];
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_display_name?: string;
  email?: string;
  account_type?: string;
  comments_count?: number;
  reactions_count?: number;
  likes_count?: number;
  viewer_reaction?: string | null;
}

export interface CreatePostData {
  content?: string;
  image_url?: string;
  video_url?: string;
  audio_url?: string;
  media?: PostMedia[];
  media_type?: 'text' | 'image' | 'video' | 'audio' | 'mixed';
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author_name?: string;
  email?: string;
  account_type?: string;
}

export const postsService = {
  getPosts: async (): Promise<Post[]> => {
    const response = await api.get('/posts');
    return response.data;
  },

  createPost: async (data: CreatePostData): Promise<Post> => {
    const response = await api.post('/posts', data);
    return response.data;
  },

  getUserPosts: async (userId: string): Promise<Post[]> => {
    const response = await api.get(`/posts/user/${userId}`);
    return response.data;
  },

  likePost: async (postId: string): Promise<{ likesCount: number }> => {
    const res = await api.post(`/posts/${postId}/like`);
    return res.data;
  },

  unlikePost: async (postId: string): Promise<{ likesCount: number }> => {
    const res = await api.delete(`/posts/${postId}/like`);
    return res.data;
  },

  react: async (postId: string, reaction_type: string) => {
    const res = await api.post(`/posts/${postId}/react`, { reaction_type });
    return res.data as { likesCount: number; totalCount: number; reaction_type?: string };
  },

  clearReaction: async (postId: string) => {
    const res = await api.delete(`/posts/${postId}/react`);
    return res.data as { likesCount: number; totalCount: number };
  },

  addComment: async (postId: string, content: string): Promise<Comment> => {
    const response = await api.post(`/posts/${postId}/comments`, { content });
    return response.data;
  },

  getComments: async (postId: string): Promise<Comment[]> => {
    const response = await api.get(`/posts/${postId}/comments`);
    return response.data;
  },

  commentReact: async (postId: string, commentId: string, reaction_type: string) => {
    const res = await api.post(`/posts/${postId}/comments/${commentId}/react`, { reaction_type });
    return res.data as { likesCount: number };
  },

  commentClearReaction: async (postId: string, commentId: string) => {
    const res = await api.delete(`/posts/${postId}/comments/${commentId}/react`);
    return res.data as { likesCount: number };
  },

  share: async (postId: string, shared_content?: string) => {
    const res = await api.post(`/posts/${postId}/share`, { shared_content });
    return res.data;
  },

  save: async (postId: string) => {
    const res = await api.post(`/posts/${postId}/save`);
    return res.data;
  },

  unsave: async (postId: string) => {
    const res = await api.delete(`/posts/${postId}/save`);
    return res.data;
  },
};
