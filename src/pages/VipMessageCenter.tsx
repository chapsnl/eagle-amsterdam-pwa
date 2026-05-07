import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, RefreshCw, Inbox, Send as SendIcon, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useDirectMessages, type DirectMessage } from "@/hooks/useDirectMessages";

interface VipSession {
  userId: string;
  email: string;
  name: string;
}

const VipMessageCenter = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [session, setSession] = useState<VipSession | null>(null);
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [composeTo, setComposeTo] = useState<{ id: string; nickname: string } | null>(null);
  const [composeText, setComposeText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; nickname: string } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("vip_session");
    if (!stored) return navigate("/vip/login");
    try {
      setSession(JSON.parse(stored));
    } catch {
      navigate("/vip/login");
    }
  }, [navigate]);

  const { data, isLoading, refresh, isFetching } = useDirectMessages();
  const messages = data?.messages || [];

  // Handle ?to=USERID&nickname=... deep link from Backroom
  useEffect(() => {
    const to = params.get("to");
    const nickname = params.get("nickname");
    if (to) {
      setComposeTo({ id: to, nickname: nickname || "Member" });
      setComposing(true);
      params.delete("to");
      params.delete("nickname");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const inbox = useMemo(
    () => messages.filter((m) => m.recipient_id === session?.userId && !m.recipient_deleted),
    [messages, session]
  );
  const sent = useMemo(
    () => messages.filter((m) => m.sender_id === session?.userId && !m.sender_deleted),
    [messages, session]
  );

  const handleOpen = async (msg: DirectMessage) => {
    const isOpen = expandedId === msg.id;
    setExpandedId(isOpen ? null : msg.id);
    if (!isOpen && msg.recipient_id === session?.userId && !msg.read_at) {
      await supabase.functions.invoke("direct-messages", {
        body: { action: "mark_read", userId: session.userId, messageId: msg.id },
      });
      refresh();
    }
  };

  const handleDelete = async (msg: DirectMessage) => {
    if (!session) return;
    if (!confirm("Delete this message?")) return;
    await supabase.functions.invoke("direct-messages", {
      body: { action: "delete", userId: session.userId, messageId: msg.id },
    });
    setExpandedId(null);
    refresh();
  };

  const handleSend = async () => {
    if (!session || !composeTo || !composeText.trim()) return;
    setSending(true);
    try {
      await supabase.functions.invoke("direct-messages", {
        body: {
          action: "send",
          userId: session.userId,
          recipientId: composeTo.id,
          recipientNickname: composeTo.nickname,
          content: composeText.trim().slice(0, 1000),
        },
      });
      setComposeText("");
      setComposing(false);
      setComposeTo(null);
      setTab("sent");
      refresh();
    } finally {
      setSending(false);
    }
  };

  const handleReplySend = async (recipientId: string, recipientNickname: string) => {
    if (!session || !replyText.trim()) return;
    setReplying(true);
    try {
      await supabase.functions.invoke("direct-messages", {
        body: {
          action: "send",
          userId: session.userId,
          recipientId,
          recipientNickname,
          content: replyText.trim().slice(0, 1000),
        },
      });
      setReplyText("");
      setReplyTo(null);
      refresh();
    } finally {
      setReplying(false);
    }
  };

  if (!session) return null;
  const list = tab === "inbox" ? inbox : sent;

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <div className="pt-6 px-4 max-w-lg mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/vip/dashboard")} className="text-muted-foreground">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-foreground flex-1">MESSAGE CENTER</h1>
          <button
            onClick={() => refresh()}
            disabled={isFetching}
            className="text-muted-foreground active:scale-95 transition-transform"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => setTab("inbox")}
            className={`py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${
              tab === "inbox" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            <Inbox className="w-4 h-4" /> INBOX
            {inbox.some((m) => !m.read_at) && (
              <span className="bg-primary-foreground text-primary text-[10px] font-bold rounded-full px-1.5 py-0.5">
                {inbox.filter((m) => !m.read_at).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("sent")}
            className={`py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${
              tab === "sent" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            <SendIcon className="w-4 h-4" /> SENT
          </button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 text-sm">
            {tab === "inbox" ? "No messages yet." : "No sent messages."}
          </p>
        ) : (
          <div className="space-y-2">
            {list.map((msg) => {
              const isInbox = tab === "inbox";
              const otherName = isInbox ? msg.sender_nickname : msg.recipient_nickname;
              const unread = isInbox && !msg.read_at;
              const expanded = expandedId === msg.id;
              return (
                <div
                  key={msg.id}
                  className={`bg-card rounded-xl border-2 transition-colors ${
                    unread ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <button
                    onClick={() => handleOpen(msg)}
                    className="w-full text-left p-3 active:scale-[0.99] transition-transform"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="flex items-center gap-2 min-w-0">
                        {unread && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0" aria-hidden />
                        )}
                        <span
                          className={`text-sm truncate ${
                            unread ? "font-extrabold text-foreground" : "font-normal text-muted-foreground"
                          }`}
                        >
                          {isInbox ? "From" : "To"}: {otherName}
                        </span>
                      </span>
                      <span className="text-muted-foreground text-[11px] shrink-0">
                        {format(new Date(msg.created_at), "dd MMM, HH:mm")}
                      </span>
                    </div>
                    {!expanded && (
                      <p
                        className={`text-xs line-clamp-1 truncate ${
                          unread ? "text-foreground font-semibold" : "text-muted-foreground"
                        }`}
                      >
                        {msg.content.replace(/\s+/g, " ").trim()}
                      </p>
                    )}
                  </button>
                  {expanded && (
                    <div className="px-3 pb-3 space-y-3">
                      <div className="bg-secondary rounded-lg p-3 border border-border">
                        <p className="text-foreground text-sm whitespace-pre-wrap break-words leading-relaxed">
                          {msg.content}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {msg.recipient_id === session.userId && (
                          <button
                            onClick={() => {
                              if (replyTo?.id === msg.sender_id) {
                                setReplyTo(null);
                              } else {
                                setReplyTo({ id: msg.sender_id, nickname: msg.sender_nickname });
                                setReplyText("");
                              }
                            }}
                            className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-1"
                          >
                            <SendIcon className="w-3.5 h-3.5" /> {replyTo?.id === msg.sender_id ? "CANCEL" : "REPLY"}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(msg)}
                          className="flex-1 py-2 rounded-lg bg-secondary text-muted-foreground font-bold text-xs flex items-center justify-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> DELETE
                        </button>
                      </div>
                      {msg.recipient_id === session.userId && replyTo?.id === msg.sender_id && (
                        <div className="space-y-2 pt-1">
                          <textarea
                            placeholder={`Reply to ${msg.sender_nickname}...`}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value.slice(0, 1000))}
                            rows={3}
                            className="w-full bg-secondary text-foreground rounded-lg px-3 py-2 text-base placeholder:text-muted-foreground outline-none resize-none border border-border"
                          />
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-muted-foreground text-[11px]">{replyText.length}/1000</p>
                            <button
                              onClick={() => handleReplySend(msg.sender_id, msg.sender_nickname)}
                              disabled={replying || !replyText.trim()}
                              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs disabled:opacity-40 active:scale-95 transition-transform flex items-center gap-1"
                            >
                              <SendIcon className="w-3.5 h-3.5" /> {replying ? "SENDING..." : "SEND"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Compose overlay */}
      {composing && (
        <div className="fixed inset-0 bg-background/95 z-40 flex items-start justify-center p-4 pt-6 overflow-y-auto">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg p-3 space-y-2 max-h-[calc(100dvh-3rem)] overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="text-foreground font-bold text-sm">NEW MESSAGE</p>
              <button
                onClick={() => {
                  setComposing(false);
                  setComposeText("");
                  setComposeTo(null);
                }}
                className="text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {composeTo ? (
              <p className="text-muted-foreground text-xs">
                To: <span className="text-foreground font-bold">{composeTo.nickname}</span>
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">
                Open a member's post in <span className="text-foreground font-bold">The Backroom</span> and tap DM to start a conversation.
              </p>
            )}
            {composeTo && (
              <>
                <textarea
                  placeholder="Write your message..."
                  value={composeText}
                  onChange={(e) => setComposeText(e.target.value.slice(0, 1000))}
                  rows={4}
                  className="w-full bg-secondary text-foreground rounded-lg px-3 py-2 text-base placeholder:text-muted-foreground outline-none resize-none"
                />
                <p className="text-right text-muted-foreground text-[11px]">{composeText.length}/1000</p>
                <button
                  onClick={handleSend}
                  disabled={sending || !composeText.trim()}
                  className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                  <SendIcon className="w-4 h-4" /> {sending ? "SENDING..." : "SEND"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VipMessageCenter;
