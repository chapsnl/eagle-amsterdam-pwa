import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Users, QrCode, Gift, RefreshCw, Check, Send, ChevronDown, ChevronUp, LogOut, ScanLine, Search, Shirt, Ticket, Beer, MessageSquare, Trash2 } from "lucide-react";
import MemberScannerSection from "@/components/admin/MemberScannerSection";
import InviteUserSection from "@/components/admin/InviteUserSection";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { Input } from "@/components/ui/input";
import WarningDialog from "@/components/shared/WarningDialog";

interface Member {
  id: string;
  name: string;
  email: string;
  vip_status: string;
  total_stamps_earned: number;
  active_vouchers: number;
  active_voucher_titles: string[];
  member_number: string | null;
  created_at: string;
  last_active_at: string | null;
}

const isOnline = (lastActive: string | null): boolean => {
  if (!lastActive) return false;
  const diff = Date.now() - new Date(lastActive).getTime();
  return diff < 3 * 60 * 1000; // 3 minutes
};

const VOUCHER_PRESETS = [
  { title: "FREE COAT CHECK", description: "Complimentary coat check.", label: "Coat Check", icon: Shirt },
  { title: "FREE ENTRY SUNDAY SEX PARTY", description: "Free entry to Sunday Sex Party.", label: "Free Entry", icon: Ticket },
  { title: "FREE DRINK", description: "One free drink at the bar.", label: "Free Drink", icon: Beer },
];

const SESSION_TIMEOUT = 4 * 60 * 60 * 1000; // 4 hours

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [codeUpdatedAt, setCodeUpdatedAt] = useState<string | null>(null);
  const [newCode, setNewCode] = useState("");
  const [savingCode, setSavingCode] = useState(false);
  const [sendingVoucher, setSendingVoucher] = useState<string | null>(null);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [warning, setWarning] = useState({ open: false, title: "", message: "" });
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [qrSectionOpen, setQrSectionOpen] = useState(false);
  const [scannedMember, setScannedMember] = useState<Member | null>(null);
  const [communityPosts, setCommunityPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [deletingPost, setDeletingPost] = useState<string | null>(null);
  const [moderationOpen, setModerationOpen] = useState(false);
  const activityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(() => {
    localStorage.removeItem("admin_session");
    const isAdminHost = window.location.hostname === "admin.eagleamsterdam.com";
    navigate(isAdminHost ? "/" : "/eagle-admin-dashboard", { replace: true });
  }, [navigate]);

  // Activity tracking — reset timer on interaction
  const resetActivityTimer = useCallback(() => {
    const stored = localStorage.getItem("admin_session");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        parsed.lastActivity = Date.now();
        localStorage.setItem("admin_session", JSON.stringify(parsed));
      } catch {}
    }

    if (activityTimer.current) clearTimeout(activityTimer.current);
    activityTimer.current = setTimeout(() => {
      logout();
    }, SESSION_TIMEOUT);
  }, [logout]);

  useEffect(() => {
    const stored = localStorage.getItem("admin_session");
    const loginPath = window.location.hostname === "admin.eagleamsterdam.com" ? "/" : "/eagle-admin-dashboard";
    if (!stored) {
      navigate(loginPath, { replace: true });
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      if (!parsed.authenticated || !parsed.userId) {
        navigate(loginPath, { replace: true });
        return;
      }

      // Check session timeout
      const lastActivity = parsed.lastActivity || parsed.timestamp || 0;
      if (Date.now() - lastActivity > SESSION_TIMEOUT) {
        localStorage.removeItem("admin_session");
        navigate(loginPath, { replace: true });
        return;
      }

      setAdminUserId(parsed.userId);
      loadData(parsed.userId);
      resetActivityTimer();
    } catch {
      navigate(loginPath, { replace: true });
    }

    // Listen for user activity
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    const handler = () => resetActivityTimer();
    events.forEach((e) => window.addEventListener(e, handler));

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (activityTimer.current) clearTimeout(activityTimer.current);
    };
  }, [navigate, resetActivityTimer]);

  const loadData = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-get-members", {
        body: { adminUserId: uid },
      });
      if (!error && data?.success) {
        setMembers(data.members || []);
        setActiveCode(data.activeCode || null);
        setCodeUpdatedAt(data.codeUpdatedAt || null);
      } else {
        setWarning({ open: true, title: "Error", message: "Failed to load data." });
      }
    } catch {
      setWarning({ open: true, title: "Error", message: "Failed to load data." });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCommunityPosts = useCallback(async () => {
    if (!adminUserId) return;
    setLoadingPosts(true);
    try {
      const { data, error } = await supabase.functions.invoke("community-posts", {
        body: { action: "list", userId: adminUserId },
      });
      if (!error && data?.success) {
        setCommunityPosts(data.posts || []);
      }
    } catch {
      // silent
    } finally {
      setLoadingPosts(false);
    }
  }, [adminUserId]);

  const handleDeletePost = async (postId: string) => {
    if (!adminUserId) return;
    setDeletingPost(postId);
    try {
      const { data, error } = await supabase.functions.invoke("community-posts", {
        body: { action: "delete", userId: adminUserId, postId },
      });
      if (!error && data?.success) {
        setCommunityPosts((prev) => prev.filter((p) => p.id !== postId && p.parent_id !== postId));
      }
    } catch {
      // silent
    } finally {
      setDeletingPost(null);
    }
  };

  const handleSaveCode = async () => {
    if (!adminUserId || !newCode.trim()) return;
    setSavingCode(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-update-loyalty-code", {
        body: { adminUserId, newCode: newCode.trim() },
      });
      if (!error && data?.success) {
        setActiveCode(data.code);
        setCodeUpdatedAt(new Date().toISOString());
        setNewCode("");
        showSuccess("QR code updated! Email sent.");
      } else {
        setWarning({ open: true, title: "Error", message: data?.error || "Failed to update code." });
      }
    } catch {
      setWarning({ open: true, title: "Error", message: "Failed to update code." });
    } finally {
      setSavingCode(false);
    }
  };

  const handleDispatchVoucher = async (targetUserId: string, preset: typeof VOUCHER_PRESETS[0]) => {
    if (!adminUserId) return;
    const key = `${targetUserId}-${preset.title}`;
    setSendingVoucher(key);
    try {
      const { data, error } = await supabase.functions.invoke("admin-dispatch-voucher", {
        body: {
          adminUserId,
          targetUserId,
          voucherTitle: preset.title,
          voucherDescription: preset.description,
        },
      });
      if (!error && data?.success) {
        showSuccess(`${preset.title} sent!`);
        // Optimistic UI update — add title to active list without re-fetching
        setMembers((prev) =>
          prev.map((m) =>
            m.id === targetUserId
              ? {
                  ...m,
                  active_vouchers: m.active_vouchers + 1,
                  active_voucher_titles: [...m.active_voucher_titles, preset.title],
                }
              : m
          )
        );
        if (scannedMember?.id === targetUserId) {
          setScannedMember((prev) =>
            prev
              ? {
                  ...prev,
                  active_vouchers: prev.active_vouchers + 1,
                  active_voucher_titles: [...prev.active_voucher_titles, preset.title],
                }
              : prev
          );
        }
      } else {
        setWarning({ open: true, title: "Error", message: data?.error || "Failed to send voucher." });
      }
    } catch {
      setWarning({ open: true, title: "Error", message: "Failed to send voucher." });
    } finally {
      setSendingVoucher(null);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Party Boy": return "text-green-400";
      case "Cruiser": return "text-blue-400";
      case "Slut": return "text-red-400";
      default: return "text-muted-foreground";
    }
  };

  const handleMemberScanned = useCallback((memberNumber: string): boolean => {
    const found = members.find((m) => m.member_number === memberNumber);
    if (found) {
      setScannedMember(found);
      setExpandedMember(found.id);
      showSuccess(`Found: ${found.name || found.email}`);
      return true;
    }
    return false;
  }, [members]);

  const filteredMembers = members.filter((m) => {
    const q = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      (m.member_number && m.member_number.includes(q))
    );
  });

  // Top 5: online users first (sorted by most recent activity), then latest signups
  const recentMembers = (() => {
    const online = members.filter((m) => isOnline(m.last_active_at))
      .sort((a, b) => new Date(b.last_active_at!).getTime() - new Date(a.last_active_at!).getTime());
    const offline = members.filter((m) => !isOnline(m.last_active_at))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return [...online, ...offline].slice(0, 5);
  })();

  if (!adminUserId) return null;

  const renderMemberRow = (member: Member) => {
    const isExpanded = expandedMember === member.id;
    const online = isOnline(member.last_active_at);
    return (
      <div key={member.id} className="bg-card border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setExpandedMember(isExpanded ? null : member.id)}
          className="w-full flex items-center justify-between p-3 text-left"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {online && (
                <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 animate-pulse" />
              )}
              <p className="text-foreground font-bold text-sm truncate">{member.name || "—"}</p>
            </div>
            <p className="text-muted-foreground text-[11px] truncate">{member.email}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] font-bold ${getStatusColor(member.vip_status)}`}>
                {member.vip_status}
              </span>
              <span className="text-muted-foreground text-[10px]">
                · {member.total_stamps_earned} tokens
              </span>
              <span className="text-muted-foreground text-[10px]">
                · {member.active_vouchers} voucher{member.active_vouchers !== 1 ? "s" : ""}
              </span>
              {member.member_number && (
                <span className="text-muted-foreground text-[10px]">
                  · #{member.member_number}
                </span>
              )}
              {member.last_active_at && (
                <span className="text-muted-foreground text-[10px]">
                  · {new Date(member.last_active_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}{" "}
                  {new Date(member.last_active_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Amsterdam" })}
                </span>
              )}
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
        </button>

        {isExpanded && (
          <div className="px-3 pb-3 space-y-2 border-t border-border pt-3">
            <p className="text-muted-foreground text-[10px] font-bold uppercase">Quick-Add Voucher</p>
            <div className="grid grid-cols-1 gap-2">
              {VOUCHER_PRESETS.map((preset) => {
                const key = `${member.id}-${preset.title}`;
                const isSending = sendingVoucher === key;
                const hasUnredeemed = member.active_voucher_titles?.includes(preset.title);
                return (
                  <button
                    key={preset.title}
                    onClick={() => handleDispatchVoucher(member.id, preset)}
                    disabled={isSending || hasUnredeemed}
                    className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold transition-all disabled:opacity-60 ${
                      hasUnredeemed
                        ? "bg-destructive/20 text-destructive border border-destructive/30 cursor-not-allowed"
                        : "bg-secondary hover:bg-secondary/80 text-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <preset.icon className="w-4 h-4" />
                      {preset.label}{hasUnredeemed ? " (active)" : ""}
                    </span>
                    {isSending ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                    ) : (
                      <Send className={`w-3.5 h-3.5 ${hasUnredeemed ? "text-destructive" : "text-primary"}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen pb-8 bg-background">
      <div className="pt-8 px-4 max-w-2xl mx-auto w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <Crown className="w-10 h-10 text-primary mx-auto" />
          <h1 className="text-2xl text-foreground font-extrabold tracking-tight">ADMIN DASHBOARD</h1>
          <p className="text-muted-foreground text-xs">Manage members, vouchers & loyalty codes</p>
        </div>

        {/* Admin Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 bg-destructive/20 hover:bg-destructive/30 text-destructive border border-destructive/30 rounded-xl py-3 font-bold text-sm transition-colors"
        >
          <LogOut className="w-4 h-4" />
          ADMIN LOGOUT
        </button>

        {/* ═══ SCANNED MEMBER ═══ */}
        {scannedMember && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-foreground font-bold text-sm flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-primary" />
                Scanned Member
              </h2>
              <button
                onClick={() => { setScannedMember(null); setExpandedMember(null); }}
                className="text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors"
              >
                Dismiss
              </button>
            </div>
            {renderMemberRow(scannedMember)}
          </section>
        )}

        {/* Success toast */}
        {successMsg && (
          <div className="flex items-center gap-2 bg-green-900/60 border border-green-700 rounded-lg px-4 py-3 text-green-200 text-sm animate-fade-in">
            <Check className="w-4 h-4" />
            {successMsg}
          </div>
        )}

        {/* ═══ LOYALTY QR CODE ═══ */}
        <section className="space-y-0">
          <button
            onClick={() => setQrSectionOpen(!qrSectionOpen)}
            className="w-full flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3"
          >
            <h2 className="text-foreground font-bold text-lg flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              Loyalty QR Code
            </h2>
            {qrSectionOpen ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>

          {qrSectionOpen && (
            <div className="bg-card rounded-b-xl px-4 pb-4 pt-2 space-y-4 border border-t-0 border-border -mt-2 rounded-t-none">
              {activeCode && (
                <div className="space-y-3">
                  <p className="text-muted-foreground text-xs">Current active code:</p>
                  <div className="bg-secondary rounded-lg p-3 text-center">
                    <p className="text-foreground font-bold text-lg tracking-widest">{activeCode}</p>
                    {codeUpdatedAt && (
                      <p className="text-muted-foreground text-[10px] mt-1">
                        Updated: {new Date(codeUpdatedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex justify-center">
                    <div className="bg-white rounded-lg p-3">
                      <QRCodeSVG value={activeCode} size={200} />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-muted-foreground text-xs">Set new loyalty code:</p>
                <div className="flex gap-2">
                  <Input
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="e.g. EAGLE_SUMMER_26"
                    className="flex-1 uppercase"
                    maxLength={50}
                  />
                  <button
                    onClick={handleSaveCode}
                    disabled={savingCode || !newCode.trim()}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-40 transition-all"
                  >
                    {savingCode ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Save"}
                  </button>
                </div>
                <p className="text-muted-foreground text-[10px]">
                  Saving invalidates the old code immediately, resets all cooldowns, and sends a QR email to your inbox.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ═══ SCAN MEMBER PASS ═══ */}
        <MemberScannerSection onMemberFound={handleMemberScanned} />

        {/* ═══ INVITE USER ═══ */}
        <InviteUserSection adminUserId={adminUserId} />

        {/* ═══ SEARCH MEMBER ═══ */}
        <section className="space-y-3">
          <h2 className="text-foreground font-bold text-lg flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Search Member
          </h2>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or member #..."
            className="w-full"
          />
          {searchQuery.trim() && (
            <div className="space-y-2">
              {filteredMembers.length > 0 ? (
                filteredMembers.map(renderMemberRow)
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">No members found.</p>
              )}
            </div>
          )}
        </section>

        {/* ═══ RECENT ACTIVITY ═══ */}
        {!loading && recentMembers.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-foreground font-bold text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Recent Activity
            </h2>
            <div className="space-y-2">
              {recentMembers.map(renderMemberRow)}
            </div>
          </section>
        )}

        {/* ═══ BACKROOM MODERATION ═══ */}
        <section className="space-y-4">
          <button
            onClick={() => { setModerationOpen(!moderationOpen); if (!moderationOpen) loadCommunityPosts(); }}
            className="w-full flex items-center justify-between"
          >
            <h2 className="text-foreground font-bold text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Backroom Moderation
            </h2>
            {moderationOpen ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>

          {moderationOpen && (
            <div className="space-y-2">
              {loadingPosts ? (
                <div className="flex justify-center py-4">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : communityPosts.filter((p) => !p.parent_id).length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No posts to moderate.</p>
              ) : (
                communityPosts
                  .filter((p) => !p.parent_id)
                  .map((post) => {
                    const replies = communityPosts.filter((r) => r.parent_id === post.id);
                    return (
                      <div key={post.id} className="bg-card rounded-xl border border-border p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-foreground font-bold text-sm">{post.topic}</p>
                            <p className="text-muted-foreground text-xs">
                              {post.nickname} · {new Date(post.created_at).toLocaleString()}
                            </p>
                            <p className="text-foreground text-sm mt-1 whitespace-pre-wrap">{post.content}</p>
                          </div>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            disabled={deletingPost === post.id}
                            className="shrink-0 p-2 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors disabled:opacity-40"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {replies.length > 0 && (
                          <div className="pl-3 border-l-2 border-primary/30 space-y-1">
                            {replies.map((reply) => (
                              <div key={reply.id} className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-foreground text-xs whitespace-pre-wrap">{reply.content}</p>
                                  <p className="text-muted-foreground text-xs">{reply.nickname} · {new Date(reply.created_at).toLocaleString()}</p>
                                </div>
                                <button
                                  onClick={() => handleDeletePost(reply.id)}
                                  disabled={deletingPost === reply.id}
                                  className="shrink-0 p-1.5 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors disabled:opacity-40"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          )}
        </section>

      </div>

      <WarningDialog
        open={warning.open}
        title={warning.title}
        message={warning.message}
        onClose={() => setWarning({ open: false, title: "", message: "" })}
      />
    </div>
  );
};

export default AdminDashboard;
