import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { postsService, Post, Comment } from "../services/posts";
import { uploadToS3 } from "../services/aws";
import { connectSocket } from "../services/realtime";
import { Layout, RightSidebar, BottomNav } from "../components/layout";
import {
  ProfileCard,
  ProfilePrompt,
  ProfileWizard,
} from "../components/profile";
import { FriendsCard } from "../components/cards";
import { PostCard } from "../components/posts";
import { readExtendedProfile } from "../utils/profile";
import { ImagePlus, Smile } from "lucide-react";

type UIPost = Post & {
  saved?: boolean;
  commentDraft?: string;
  showComments?: boolean;
  comments?: Comment[];
  showOneComment?: boolean;
};

const Feed: React.FC = () => {
  const { isGuest, user } = useAuth();
  const [posts, setPosts] = useState<UIPost[]>([]);
  const [newPost, setNewPost] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [commentModalFor, setCommentModalFor] = useState<string | null>(null);

  const [promptOpen, setPromptOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const postsData = await postsService.getPosts();
        const savedSet = new Set<string>(
          JSON.parse(
            localStorage.getItem(`saved_posts_${user?.id || "guest"}`) || "[]",
          ),
        );
        setPosts(
          postsData.map((p) => ({
            ...p,
            saved: savedSet.has(p.id),
            commentDraft: "",
            showOneComment: true as any,
          })),
        );
        // Prefetch the first comment for up to 5 posts that have comments
        const toPrefetch = postsData
          .filter((p) => (p.comments_count || 0) > 0)
          .slice(0, 5);
        for (const p of toPrefetch) {
          try {
            const cs = await postsService.getComments(p.id);
            setPosts((prev) =>
              prev.map((pp) =>
                pp.id === p.id
                  ? ({ ...pp, comments: cs.slice(0, 1) } as any)
                  : pp,
              ),
            );
          } catch {}
        }
      } catch (error) {
        console.error("Error fetching posts:", error);
      }
    };

    fetchPosts();

    try {
      const skip =
        localStorage.getItem(`profile_prompt_skipped_${user?.id}`) === "1";
      const ext = readExtendedProfile(user?.id);
      if (!skip && user && (!ext || !ext.profile_picture)) {
        setPromptOpen(true);
      }
    } catch {}

    const socket = connectSocket();
    socket.on("post:created", (post: UIPost) => {
      setPosts((prev) =>
        prev.find((p) => p.id === post.id) ? prev : [post, ...prev],
      );
    });
    socket.on("comment:created", ({ postId }: { postId: string }) => {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, comments_count: (p.comments_count || 0) + 1 }
            : p,
        ),
      );
    });
    socket.on(
      "reaction:updated",
      ({ postId, userId, reaction_type, likesCount, totalCount }: any) => {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  likes_count: likesCount,
                  reactions_count:
                    typeof totalCount === "number"
                      ? totalCount
                      : p.reactions_count,
                  viewer_reaction:
                    user?.id === userId ? reaction_type : p.viewer_reaction,
                }
              : p,
          ),
        );
      },
    );

    return () => {
      socket.off("post:created");
      socket.off("comment:created");
      socket.off("reaction:updated");
    };
  }, [user?.id]);

  const handleUpdatePost = (postId: string, updates: Partial<UIPost>) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, ...updates } : p)),
    );
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest || (!newPost.trim() && files.length === 0)) return;

    setLoading(true);
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
        // Legacy single fields for backward-compatibility
        const first = uploaded[0];
        if (first.type === "image") payload.image_url = first.url;
        if (first.type === "video") payload.video_url = first.url;
        if (first.type === "audio") payload.audio_url = first.url;
      }
      const created = await postsService.createPost(payload);
      setPosts((prev) =>
        prev.find((p) => p.id === created.id) ? prev : [created, ...prev],
      );
      setNewPost("");
      setFiles([]);
      setPreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Error creating post:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <Layout>
      <div className="grid grid-cols-12 gap-6">
        {/* Left profile column */}
        <div className="hidden lg:block col-span-4 xl:col-span-3 sticky top-2 self-start space-y-6">
          <ProfileCard />
          {/* My organizations under profile */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">My organizations</h4>
            </div>
            <ul className="space-y-3 text-sm">
              {[
                { name: "UIUX designer community", members: 24 },
                { name: "Fullstack website developer", members: 19 },
              ].map((o, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-sky-400 to-violet-500" />
                  <div>
                    <p className="text-gray-800">{o.name}</p>
                    <p className="text-[11px] text-gray-500">
                      {o.members} members are currently active
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Center posts */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-6">
          <section className="space-y-6">
            {/* Inline navigation at top of posts (sticky) */}
            <BottomNav placement="inline" sticky />
            {!isGuest && (
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <form onSubmit={handleCreatePost}>
                  <div className="flex items-start gap-3">
                    <img
                      className="h-10 w-10 rounded-full object-cover"
                      src={`https://i.pravatar.cc/40?u=${user?.id || "me"}`}
                      alt="me"
                    />
                    <textarea
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      placeholder="What's on your mind?"
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#26c66e]"
                      rows={2}
                    />
                  </div>

                  {/* Previews */}
                  {previews.length > 0 && (
                    <div
                      className="mt-3 grid gap-2"
                      style={{
                        gridTemplateColumns: `repeat(${Math.min(previews.length, 3)}, minmax(0, 1fr))`,
                      }}
                    >
                      {previews.map((src, idx) => (
                        <div key={idx} className="relative">
                          {files[idx]?.type.startsWith("video/") ? (
                            <video
                              src={src}
                              className="w-full rounded-lg"
                              controls
                              muted
                            />
                          ) : files[idx]?.type.startsWith("audio/") ? (
                            <audio src={src} className="w-full" controls />
                          ) : (
                            <img
                              src={src}
                              alt="preview"
                              className="w-full rounded-lg object-cover"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*,audio/*"
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
                        className="px-3 py-2 rounded-full hover:bg-gray-50 flex items-center gap-2"
                      >
                        <ImagePlus className="w-4 h-4" />{" "}
                        <span>Photo/Video</span>
                      </button>
                      <button
                        type="button"
                        className="px-3 py-2 rounded-full hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Smile className="w-4 h-4" /> <span>Feeling</span>
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={
                        (files.length > 0 ? false : !newPost.trim()) || loading
                      }
                      className="bg-[#26c66e] text-white px-5 py-2 rounded-full font-medium hover:bg-[#1e9d5c] disabled:opacity-50"
                    >
                      {loading ? "Posting..." : "Post"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {isGuest && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <p className="text-yellow-800 font-medium">
                  🔒 You're viewing as a guest. Sign in to create posts and
                  interact with content.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  isGuest={isGuest}
                  currentUserId={user?.id}
                  onUpdatePost={handleUpdatePost}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Right sidebar */}
        <div className="hidden lg:block col-span-4 xl:col-span-3 sticky top-2 self-start space-y-6">
          <RightSidebar />
        </div>
      </div>
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
                posts.find((p) => p.id === commentModalFor)?.comments || []
              ).map((c) => (
                <div key={c.id} className="flex gap-3 items-start">
                  <div className="h-8 w-8 rounded-full bg-gray-200" />
                  <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-full">
                    <p className="text-xs text-gray-600 font-medium">
                      {c.author_name || "User"}
                    </p>
                    <p className="text-sm text-gray-800">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <ProfilePrompt
        open={promptOpen}
        onComplete={() => {
          setPromptOpen(false);
          setWizardOpen(true);
        }}
        onSkip={() => {
          setPromptOpen(false);
          localStorage.setItem(`profile_prompt_skipped_${user?.id}`, "1");
        }}
      />
      <ProfileWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </Layout>
  );
};

export default Feed;
