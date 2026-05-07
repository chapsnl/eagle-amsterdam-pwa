import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, ChevronDown, ChevronUp, MessageSquare, Send, Mail, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface Post {
  id: string;
  user_id: string;
  parent_id: string | null;
  nickname: string;
  topic: string;
  content: string;
  created_at: string;
}

interface VipSession {
  userId: string;
  email: string;
  name: string;
}

const TheBackroom = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<VipSession | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [showNewPost, setShowNewPost] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  // Form states
  const [nickname, setNickname] = useState("");
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dmTarget, setDmTarget] = useState<{ userId: string; nickname: string } | null>(null);
  const [dmContent, setDmContent] = useState("");
  const [dmSending, setDmSending] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("vip_session");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSession(parsed);
        setNickname(parsed.name || "");
      } catch {
        navigate("/vip/login");
      }
    } else {
      navigate("/vip/login");
    }
  }, [navigate]);

  const loadPosts = useCallback(async () => {
    if (!session) return;
    try {
      const { data, error } = await supabase.functions.invoke("community-posts", {
        body: { action: "list", userId: session.userId },
      });
      if (!error && data?.success) {
        setPosts(data.posts || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) loadPosts();
  }, [session, loadPosts]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("backroom-posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_posts" }, () => {
        loadPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadPosts]);

  const topLevelPosts = posts.filter((p) => !p.parent_id);
  const getReplies = (postId: string) =>
    posts.filter((p) => p.parent_id === postId).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const handleSubmitPost = async () => {
    if (!topic.trim() || !content.trim() || !nickname.trim()) return;
    setSubmitting(true);
    try {
      await supabase.functions.invoke("community-posts", {
        body: { action: "create", userId: session!.userId, nickname: nickname.trim(), topic: topic.trim(), content: content.trim() },
      });
      setTopic("");
      setContent("");
      setShowNewPost(false);
      await loadPosts();
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string, parentTopic: string) => {
    if (!replyContent.trim() || !nickname.trim()) return;
    setSubmitting(true);
    try {
      await supabase.functions.invoke("community-posts", {
        body: {
          action: "create",
          userId: session!.userId,
          nickname: nickname.trim(),
          topic: parentTopic,
          content: replyContent.trim(),
          parentId,
        },
      });
      setReplyContent("");
      setReplyingTo(null);
      await loadPosts();
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  const handleContentChange = (value: string) => {
    const lines = value.split("\n");
    if (lines.length <= 5) {
      setContent(value.slice(0, 500));
    }
  };

  const handleReplyChange = (value: string) => {
    const lines = value.split("\n");
    if (lines.length <= 5) {
      setReplyContent(value.slice(0, 500));
    }
  };

  if (!session) return null;

  return (
    <div className="flex flex-col min-h-screen pb-24 overflow-x-hidden">
      <div className="pt-6 px-4 max-w-lg mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/vip/dashboard")} className="text-muted-foreground">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-foreground">THE BACKROOM</h1>
        </div>

        {/* New Post button */}
        {!showNewPost && (
          <button
            onClick={() => setShowNewPost(true)}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 mb-6 font-bold tracking-wide active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5" />
            NEW POST
          </button>
        )}

        {/* New Post form */}
        {showNewPost && (
          <div className="bg-card rounded-xl p-4 mb-6 space-y-3 border border-border">
            <input
              type="text"
              placeholder="Your nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value.slice(0, 30))}
              className="w-full bg-secondary text-foreground rounded-lg px-3 py-2 text-base placeholder:text-muted-foreground outline-none"
            />
            <input
              type="text"
              placeholder="Topic / Subject"
              value={topic}
              onChange={(e) => setTopic(e.target.value.slice(0, 100))}
              className="w-full bg-secondary text-foreground rounded-lg px-3 py-2 text-base placeholder:text-muted-foreground outline-none"
            />
            <textarea
              placeholder="Write your message (max 5 lines)..."
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              rows={5}
              className="w-full bg-secondary text-foreground rounded-lg px-3 py-2 text-base placeholder:text-muted-foreground outline-none resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowNewPost(false)}
                className="flex-1 py-2 rounded-lg bg-secondary text-muted-foreground font-bold text-sm"
              >
                CANCEL
              </button>
              <button
                onClick={handleSubmitPost}
                disabled={submitting || !topic.trim() || !content.trim() || !nickname.trim()}
                className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform"
              >
                {submitting ? "POSTING..." : "POST"}
              </button>
            </div>
          </div>
        )}

        {/* Posts */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : topLevelPosts.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No posts yet. Be the first!</p>
        ) : null}

        {/* Posts always rendered below */}
        {!loading && topLevelPosts.length > 0 && (
          <div className="space-y-3">
            {topLevelPosts.map((post) => {
              const replies = getReplies(post.id);
              const isExpanded = expandedPost === post.id;

              return (
                <div key={post.id} className="bg-card rounded-xl border border-border overflow-hidden">
                  {/* Collapsed header */}
                  <button
                    onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-bold text-sm truncate">{post.topic}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {post.nickname} · {format(new Date(post.created_at), "dd MMM yyyy, HH:mm")}
                        {replies.length > 0 && (
                          <span className="text-primary ml-2">
                            {replies.length} {replies.length === 1 ? "reply" : "replies"}
                          </span>
                        )}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0 ml-2" />
                    )}
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4">
                      {/* Original post */}
                      <div className="bg-secondary rounded-lg p-3">
                        <p className="text-foreground text-sm whitespace-pre-wrap">{post.content}</p>
                        {post.user_id !== session.userId && (
                          <button
                            onClick={() =>
                              navigate(`/vip/messages?to=${post.user_id}&nickname=${encodeURIComponent(post.nickname)}`)
                            }
                            className="mt-2 inline-flex items-center gap-1 text-primary text-xs font-bold active:scale-95 transition-transform"
                          >
                            <Mail className="w-3.5 h-3.5" /> DM
                          </button>
                        )}
                      </div>

                      {/* Replies */}
                      {replies.length > 0 && (
                        <div className="space-y-2 pl-3 border-l-2 border-primary/30">
                          {replies.map((reply) => (
                            <div key={reply.id} className="bg-secondary/50 rounded-lg p-3">
                              <p className="text-foreground text-sm whitespace-pre-wrap">{reply.content}</p>
                              <div className="flex items-center justify-between mt-2 gap-2">
                                <p className="text-muted-foreground text-xs">
                                  {reply.nickname} · {format(new Date(reply.created_at), "dd MMM yyyy, HH:mm")}
                                </p>
                                {reply.user_id !== session.userId && (
                                  <button
                                    onClick={() =>
                                      navigate(`/vip/messages?to=${reply.user_id}&nickname=${encodeURIComponent(reply.nickname)}`)
                                    }
                                    className="inline-flex items-center gap-1 text-primary text-xs font-bold active:scale-95 transition-transform shrink-0"
                                  >
                                    <Mail className="w-3 h-3" /> DM
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply form */}
                      {replyingTo === post.id ? (
                        <div className="space-y-2">
                          <textarea
                            placeholder="Write your reply (max 5 lines)..."
                            value={replyContent}
                            onChange={(e) => handleReplyChange(e.target.value)}
                            rows={3}
                            className="w-full bg-secondary text-foreground rounded-lg px-3 py-2 text-base placeholder:text-muted-foreground outline-none resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setReplyingTo(null); setReplyContent(""); }}
                              className="flex-1 py-2 rounded-lg bg-secondary text-muted-foreground font-bold text-xs"
                            >
                              CANCEL
                            </button>
                            <button
                              onClick={() => handleSubmitReply(post.id, post.topic)}
                              disabled={submitting || !replyContent.trim()}
                              className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs disabled:opacity-40 flex items-center justify-center gap-1 active:scale-95 transition-transform"
                            >
                              <Send className="w-3.5 h-3.5" />
                              {submitting ? "SENDING..." : "REPLY"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setReplyingTo(post.id)}
                          className="flex items-center gap-2 text-primary text-sm font-bold active:scale-95 transition-transform"
                        >
                          <MessageSquare className="w-4 h-4" />
                          RESPOND
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TheBackroom;
