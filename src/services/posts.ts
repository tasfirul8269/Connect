import api from './api';

export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_display_name?: string;
  email?: string;
  account_type?: string;
}

export interface CreatePostData {
  content: string;
  image_url?: string;
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

  likePost: async (postId: string): Promise<void> => {
    await api.post(`/posts/${postId}/like`);
  },

  unlikePost: async (postId: string): Promise<void> => {
    await api.delete(`/posts/${postId}/like`);
  },

  addComment: async (postId: string, content: string): Promise<Comment> => {
    const response = await api.post(`/posts/${postId}/comments`, { content });
    return response.data;
  },

  getComments: async (postId: string): Promise<Comment[]> => {
    const response = await api.get(`/posts/${postId}/comments`);
    return response.data;
  },
};
