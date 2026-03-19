import { useState, useCallback } from "react";
import { UserPlus, X, Send, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface InviteUserSectionProps {
  adminUserId: string;
}

const InviteUserSection = ({ adminUserId }: InviteUserSectionProps) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleOpen = () => {
    setEmail(localStorage.getItem("remembered_invite_email") || "");
    setError("");
    setSent(false);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setError("");
    setSent(false);
  };

  const handleSend = useCallback(async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setSending(true);
    setError("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("send-invite-email", {
        body: { adminUserId, email: trimmed },
      });

      if (fnError || !data?.success) {
        setError(data?.error || "Failed to send invite.");
      } else {
        localStorage.setItem("remembered_invite_email", trimmed);
        setSent(true);
        setTimeout(() => {
          setOpen(false);
          setSent(false);
          setEmail("");
        }, 2000);
      }
    } catch {
      setError("Failed to send invite.");
    } finally {
      setSending(false);
    }
  }, [email, adminUserId]);

  return (
    <>
      <Button
        onClick={handleOpen}
        className="w-full bg-primary text-primary-foreground font-bold text-sm py-6 rounded-xl"
      >
        <UserPlus className="w-5 h-5 mr-2" />
        Invite User
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="bg-card border-border max-w-md mx-auto p-0 gap-0 [&>button]:hidden">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <DialogTitle className="text-foreground font-bold text-lg flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Invite User
            </DialogTitle>
            <button
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground transition-colors rounded-full p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-4 pb-4 space-y-3">
            <p className="text-muted-foreground text-xs leading-relaxed">
              Send an invitation email with app benefits and installation instructions.
            </p>

            {sent ? (
              <div className="rounded-xl bg-green-900/40 border border-green-700 p-4 text-center animate-fade-in">
                <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-green-200 text-sm font-bold">Invite sent!</p>
              </div>
            ) : (
              <>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address..."
                  className="w-full"
                  autoFocus
                />

                {error && (
                  <p className="text-destructive text-xs font-bold">{error}</p>
                )}

                <Button
                  onClick={handleSend}
                  disabled={sending || !email.trim()}
                  className="w-full bg-primary text-primary-foreground font-bold"
                >
                  {sending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {sending ? "Sending..." : "Send Invite"}
                </Button>
              </>
            )}

            <Button variant="outline" onClick={handleClose} className="w-full">
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InviteUserSection;
