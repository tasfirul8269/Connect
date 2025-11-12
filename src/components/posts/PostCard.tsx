import React, { useRef, useState } from 'react';
import { Smile, MoreHorizontal } from 'lucide-react';
import { postsService, Post, Comment } from '../../services/posts';

type UIPost = Post & { 
  saved?: boolean; 
  commentDraft?: string; 
  showComments?: boolean; 
  comments?: Comment[]; 
  showOneComment?: boolean 
};

interface PostCardProps {
  post: UIPost;
  isGuest?: boolean;
  currentUserId?: string;
  onUpdatePost: (postId: string, updates: Partial<UIPost>) => void;
  onOpenCommentModal?: (postId: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({ 
  post, 
  isGuest = false, 
  currentUserId,
  onUpdatePost,
  onOpenCommentModal 
}) => {
  const [reactionBarFor, setReactionBarFor] = useState<string | null>(null);
  const reactionHideTimer = useRef<number | null>(null);

  const reactionEmoji: Record<string, string> = { 
    like: '👍', love: '❤️', laugh: '😂', wow: '😮', sad: '😢', angry: '😡' 
  };

  const cancelReactionHide = () => {
    if (reactionHideTimer.current) {
      window.clearTimeout(reactionHideTimer.current);
      reactionHideTimer.current = null;
    }
  };

  const scheduleReactionHide = (postId: string) => {
    cancelReactionHide();
    reactionHideTimer.current = window.setTimeout(() => {
      setReactionBarFor(curr => (curr === postId ? null : curr));
    }, 300);
  };

  const handleToggleLike = async () => {
    if (isGuest) return;
    setReactionBarFor(null);
    
    const current = post.viewer_reaction as string | null | undefined;
    
    // Optimistic update
    const updates: Partial<UIPost> = {};
    if (!current) {
      updates.viewer_reaction = 'like';
      updates.likes_count = (post.likes_count || 0) + 1;
      updates.reactions_count = (post.reactions_count || 0) + 1;
    } else if (current === 'like') {
      updates.viewer_reaction = null;
      updates.likes_count = Math.max(0, (post.likes_count || 0) - 1);
      updates.reactions_count = Math.max(0, (post.reactions_count || 0) - 1);
    } else {
      updates.viewer_reaction = 'like';
      updates.likes_count = (post.likes_count || 0) + 1;
    }
    onUpdatePost(post.id, updates);

    try {
      if (current === 'like') {
        const { likesCount, totalCount } = await postsService.clearReaction(post.id);
        onUpdatePost(post.id, { likes_count: likesCount, reactions_count: totalCount });
      } else {
        const { likesCount, totalCount } = await postsService.react(post.id, 'like');
        onUpdatePost(post.id, { likes_count: likesCount, reactions_count: totalCount });
      }
    } catch (error) {
      console.error('Error updating reaction:', error);
    }
  };

  const handleReact = async (reactionType: string) => {
    if (isGuest) return;
    setReactionBarFor(null);
    
    const prev = post.viewer_reaction;
    const updates: Partial<UIPost> = {
      viewer_reaction: reactionType as any,
      likes_count: (post.likes_count || 0) + ((prev === 'like' ? -1 : 0) + (reactionType === 'like' ? 1 : 0)),
      reactions_count: (post.reactions_count || 0) + (prev ? 0 : 1)
    };
    onUpdatePost(post.id, updates);

    try {
      const { likesCount, totalCount } = await postsService.react(post.id, reactionType);
      onUpdatePost(post.id, { likes_count: likesCount, reactions_count: totalCount });
    } catch (err) {
      console.error('Error reacting:', err);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/feed?post=${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Connections', url });
      } else {
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard');
      }
      await postsService.share(post.id);
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleToggleSave = async () => {
    if (isGuest) return;
    const wasSaved = post.saved;
    onUpdatePost(post.id, { saved: !wasSaved });

    try {
      if (wasSaved) {
        await postsService.unsave(post.id);
      } else {
        await postsService.save(post.id);
      }
      
      // Update localStorage
      const key = `saved_posts_${currentUserId || 'guest'}`;
      const savedIds = JSON.parse(localStorage.getItem(key) || '[]');
      if (wasSaved) {
        const filtered = savedIds.filter((id: string) => id !== post.id);
        localStorage.setItem(key, JSON.stringify(filtered));
      } else {
        localStorage.setItem(key, JSON.stringify([...savedIds, post.id]));
      }
    } catch (error) {
      console.error('Error saving post:', error);
      onUpdatePost(post.id, { saved: wasSaved });
    }
  };

  const handleCommentSubmit = async () => {
    if (isGuest || !post.commentDraft?.trim()) return;

    try {
      await postsService.addComment(post.id, post.commentDraft.trim());
      onUpdatePost(post.id, { 
        comments_count: (post.comments_count || 0) + 1, 
        commentDraft: '' 
      });
      
      if (post.showComments) {
        const comments = await postsService.getComments(post.id);
        onUpdatePost(post.id, { comments });
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    }
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
    <article className="bg-white border border-gray-200 rounded-2xl shadow-sm">
      {/* Card header */}
      <header className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            className="w-10 h-10 rounded-full object-cover" 
            src={`https://i.pravatar.cc/40?u=${post.user_id}`} 
            alt="avatar" 
          />
          <div>
            <h3 className="font-semibold text-gray-900 leading-tight">
              {post.author_display_name || post.author_name || 'User'}
            </h3>
            <p className="text-[11px] text-gray-500">{formatTimeAgo(post.created_at)}</p>
          </div>
        </div>
        <button className="p-2 rounded-full hover:bg-gray-100">
          <MoreHorizontal className="w-5 h-5 text-gray-500" />
        </button>
      </header>

      {/* Caption */}
      {post.content && (
        <div className="px-5 pb-1 text-sm text-gray-700">
          {post.content}
        </div>
      )}

      {/* Media */}
      <div className="px-5 pb-3">
        <div className="rounded-xl overflow-hidden border border-gray-200">
          {post.media && post.media.length > 0 ? (
            <div 
              className="grid gap-2" 
              style={{ gridTemplateColumns: `repeat(${Math.min(post.media.length, 2)}, minmax(0, 1fr))` }}
            >
              {post.media.map((m, idx) => (
                <div key={idx} className="w-full">
                  {m.type === 'image' ? (
                    <img src={m.url} alt="post" className="w-full object-cover" />
                  ) : m.type === 'video' ? (
                    <video src={m.url} controls className="w-full" />
                  ) : (
                    <audio src={m.url} controls className="w-full" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <>
              {post.image_url && <img src={post.image_url} alt="post" className="w-full object-cover" />}
              {post.video_url && <video src={post.video_url} controls className="w-full" />}
              {post.audio_url && <audio src={post.audio_url} controls className="w-full" />}
            </>
          )}
        </div>
      </div>

      {/* Actions row */}
      <div className="px-5 py-3 flex items-center gap-3 text-sm text-gray-600">
        <div
          onMouseEnter={() => { cancelReactionHide(); setReactionBarFor(post.id); }}
          onMouseLeave={() => scheduleReactionHide(post.id)}
          className="relative"
        >
          <button
            onClick={handleToggleLike}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 ${
              post.viewer_reaction ? 'text-[#26c66e] bg-[#e9f9f0] border-[#bfeedd]' : 'hover:bg-gray-50'
            }`}
            disabled={isGuest}
          >
            {post.viewer_reaction ? (
              <span className="text-lg leading-none">{reactionEmoji[post.viewer_reaction]}</span>
            ) : (
              <Smile className="w-4 h-4" />
            )}
            <span className="text-xs text-gray-500">{post.reactions_count || 0}</span>
          </button>
          
          {reactionBarFor === post.id && !isGuest && (
            <div 
              className="absolute -top-12 left-0 bg-white border border-gray-200 rounded-full shadow-sm px-2 py-1 flex gap-2 select-none z-10" 
              onMouseEnter={cancelReactionHide} 
              onMouseLeave={() => scheduleReactionHide(post.id)}
            >
              {['like', 'love', 'laugh', 'wow', 'sad', 'angry'].map((r) => (
                <button
                  key={r}
                  onClick={() => handleReact(r)}
                  className="w-8 h-8 grid place-items-center text-xl hover:scale-110 transition-transform"
                  title={r}
                >
                  {reactionEmoji[r]}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <button onClick={handleShare} className="px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50">
          Share
        </button>
        
        <button 
          onClick={handleToggleSave} 
          className={`ml-auto px-3 py-1.5 rounded-full border ${
            post.saved ? 'border-[#26c66e] text-[#26c66e] bg-[#e9f9f0]' : 'border-gray-200 hover:bg-gray-50'
          }`}
          disabled={isGuest}
        >
          {post.saved ? 'Saved' : 'Save'}
        </button>
      </div>

      {/* Comment preview */}
      <div className="px-5 -mt-1 pb-2 text-xs space-y-2">
        {(post.showOneComment ?? true) && post.comments && post.comments[0] && (
          <div className="flex gap-3 items-start text-sm text-gray-700">
            <div className="h-7 w-7 rounded-full bg-gray-200" />
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <p className="text-xs text-gray-600 font-medium">
                {post.comments[0].author_name || 'User'}
              </p>
              <p className="text-sm text-gray-800">{post.comments[0].content}</p>
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-4">
          {(post.comments_count || 0) > 1 && onOpenCommentModal && (
            <button
              onClick={() => onOpenCommentModal(post.id)}
              className="text-[#26c66e] hover:underline"
            >
              View all comments ({post.comments_count})
            </button>
          )}
          
          {(post.comments_count || 0) > 0 && (
            post.showOneComment ? (
              <button 
                className="text-gray-500 hover:underline" 
                onClick={() => onUpdatePost(post.id, { showOneComment: false })}
              >
                Hide comments
              </button>
            ) : (
              <button 
                className="text-gray-500 hover:underline" 
                onClick={() => onUpdatePost(post.id, { showOneComment: true })}
              >
                Show comment
              </button>
            )
          )}
        </div>
      </div>

      {/* Comment input */}
      <div className="px-5 pb-4">
        <div className="flex items-center gap-3">
          <img 
            className="h-9 w-9 rounded-full object-cover" 
            src={`https://i.pravatar.cc/36?u=${currentUserId || 'guest'}`} 
            alt="me" 
          />
          <input
            id={`comment-${post.id}`}
            type="text"
            value={post.commentDraft || ''}
            onChange={(e) => onUpdatePost(post.id, { commentDraft: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCommentSubmit();
              }
            }}
            placeholder="Write your comment"
            className="flex-1 rounded-full bg-gray-50 border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#26c66e]"
            disabled={isGuest}
          />
        </div>
      </div>
    </article>
  );
};

export default PostCard;
