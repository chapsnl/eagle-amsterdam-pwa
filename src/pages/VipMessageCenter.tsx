import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, RefreshCw, Inbox, Send as SendIcon, Trash2, Plus, X } from "lucide-react";
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
  const [openMessage, setOpenMessage] = useState<DirectMessage | null>(null);
  const [composing, setComposing] = useState(false);
  const [composeTo, setComposeTo] = useState<{ id: string; nickname: string } | null>(null);
  const [composeText, setComposeText] = useState("");
  const [sending, setSending] = useState(false);

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
    setOpenMessage(msg);
    if (msg.recipient_id === session?.userId && !msg.read_at) {
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
    setOpenMessage(null);
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
              return (
                <button
                  key={msg.id}
                  onClick={() => handleOpen(msg)}
                  className={`w-full text-left bg-card rounded-xl border p-3 active:scale-[0.99] transition-transform ${
                    unread ? "border-primary" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-sm truncate ${unread ? "font-bold text-foreground" : "text-foreground"}`}>
                      {isInbox ? "From" : "To"}: {otherName}
                    </span>
                    <span className="text-muted-foreground text-[11px] shrink-0">
                      {format(new Date(msg.created_at), "dd MMM, HH:mm")}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs line-clamp-1">{msg.content}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating compose button (only when not opened in deep-link mode) */}
      {!openMessage && !composing && (
        <button
          onClick={() => {
            setComposeTo(null);
            setComposing(true);
          }}
          className="fixed bottom-24 right-1/2 translate-x-[240px] bg-primary text-primary-foreground rounded-full w-14 h-14 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          aria-label="New message"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Open message overlay */}
      {openMessage && (
        <div className="fixed inset-0 bg-background/95 z-40 flex items-end sm:items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-foreground font-bold text-sm">
                {openMessage.recipient_id === session.userId
                  ? `From: ${openMessage.sender_nickname}`
                  : `To: ${openMessage.recipient_nickname}`}
              </p>
              <button onClick={() => setOpenMessage(null)} className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-muted-foreground text-xs">
              {format(new Date(openMessage.created_at), "dd MMM yyyy, HH:mm")}
            </p>
            <div className="bg-secondary rounded-lg p-3">
              <p className="text-foreground text-sm whitespace-pre-wrap break-words">{openMessage.content}</p>
            </div>
            <div className="flex gap-2 pt-1">
              {openMessage.recipient_id === session.userId && (
                <button
                  onClick={() => {
                    setComposeTo({ id: openMessage.sender_id, nickname: openMessage.sender_nickname });
                    setOpenMessage(null);
                    setComposing(true);
                  }}
                  className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-1"
                >
                  <SendIcon className="w-3.5 h-3.5" /> REPLY
                </button>
              )}
              <button
                onClick={() => handleDelete(openMessage)}
                className="flex-1 py-2 rounded-lg bg-secondary text-muted-foreground font-bold text-xs flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> DELETE
              </button>
            </div>
          </div>
        </div>
      )}

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
