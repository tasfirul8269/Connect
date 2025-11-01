import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navigation from '../components/Navigation';
import { postsService, Post } from '../services/posts';

const Feed: React.FC = () => {
  const { isGuest } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const postsData = await postsService.getPosts();
        setPosts(postsData);
      } catch (error) {
        console.error('Error fetching posts:', error);
      }
    };

    fetchPosts();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || isGuest) return;

    setLoading(true);
    try {
      const newPostData = await postsService.createPost({ content: newPost });
      setPosts(prev => [newPostData, ...prev]);
      setNewPost('');
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (isGuest) return;
    try {
      await postsService.likePost(postId);
      // You could update local state here to show the like
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleComment = (postId: string) => {
    if (isGuest) return;
    // In a real app, you'd open a comment modal or navigate to comments
    console.log('Comment on post:', postId);
  };

  const handleShare = (postId: string) => {
    if (isGuest) return;
    // In a real app, you'd implement sharing functionality
    console.log('Share post:', postId);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-4xl mx-auto p-5">
        <div className="space-y-6">
          {!isGuest && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <form onSubmit={handleCreatePost} className="space-y-4">
                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full p-4 border-2 border-gray-200 rounded-lg text-base resize-vertical min-h-[100px] transition-colors focus:outline-none focus:border-primary-500"
                  rows={3}
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!newPost.trim() || loading}
                    className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-6 py-2 rounded-lg font-semibold transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {loading ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {isGuest && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <p className="text-yellow-800 font-medium">🔒 You're viewing as a guest. Sign in to create posts and interact with content.</p>
            </div>
          )}

          <div className="space-y-6">
            {posts.map((post) => (
              <div key={post.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                    {(post.author_display_name || post.author_name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{post.author_display_name || post.author_name || 'User'}</h3>
                    <p className="text-sm text-gray-500">{formatTimeAgo(post.created_at)}</p>
                  </div>
                </div>
                
                <div className="mb-4">
                  <p className="text-gray-800 leading-relaxed">{post.content}</p>
                </div>
                
                <div className="flex space-x-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      isGuest 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-primary-600'
                    }`}
                    disabled={isGuest}
                    title={isGuest ? 'Sign in to like' : 'Like'}
                  >
                    <span>👍</span>
                    <span>Like</span>
                  </button>
                  <button
                    onClick={() => handleComment(post.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      isGuest 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-primary-600'
                    }`}
                    disabled={isGuest}
                    title={isGuest ? 'Sign in to comment' : 'Comment'}
                  >
                    <span>💬</span>
                    <span>Comment</span>
                  </button>
                  <button
                    onClick={() => handleShare(post.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      isGuest 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-primary-600'
                    }`}
                    disabled={isGuest}
                    title={isGuest ? 'Sign in to share' : 'Share'}
                  >
                    <span>🔗</span>
                    <span>Share</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Feed;
