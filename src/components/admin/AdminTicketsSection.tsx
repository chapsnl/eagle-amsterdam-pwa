import { useState, useEffect, useCallback } from "react";
import { Ticket, ChevronDown, ChevronUp, ArrowUp, ArrowDown, Save, Eye, EyeOff, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

interface TicketItem {
  id: string;
  name: string;
  type: string;
  url: string | null;
  popup_message: string | null;
  display_order: number;
  active: boolean;
}

interface AdminTicketsSectionProps {
  adminUserId: string;
}

const AdminTicketsSection = ({ adminUserId }: AdminTicketsSectionProps) => {
  const [open, setOpen] = useState(false);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, Partial<TicketItem>>>({});

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-tickets", {
        body: { adminUserId, action: "list" },
      });
      if (!error && data?.success) {
        setTickets(data.tickets || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [adminUserId]);

  useEffect(() => {
    if (open && tickets.length === 0) loadTickets();
  }, [open, loadTickets, tickets.length]);

  const getEdit = (id: string) => editValues[id] || {};

  const setEdit = (id: string, field: string, value: string | boolean) => {
    setEditValues((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSave = async (ticket: TicketItem) => {
    const edits = getEdit(ticket.id);
    if (Object.keys(edits).length === 0) return;
    setSaving(ticket.id);
    try {
      await supabase.functions.invoke("admin-manage-tickets", {
        body: { adminUserId, action: "update", ticket: { id: ticket.id, ...edits } },
      });
      setEditValues((prev) => { const n = { ...prev }; delete n[ticket.id]; return n; });
      await loadTickets();
    } catch {} finally {
      setSaving(null);
    }
  };

  const handleToggleActive = async (ticket: TicketItem) => {
    setSaving(ticket.id);
    try {
      await supabase.functions.invoke("admin-manage-tickets", {
        body: { adminUserId, action: "update", ticket: { id: ticket.id, active: !ticket.active } },
      });
      await loadTickets();
    } catch {} finally {
      setSaving(null);
    }
  };

  const handleSwap = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tickets.length) return;
    const id1 = tickets[index].id;
    const id2 = tickets[targetIndex].id;
    try {
      await supabase.functions.invoke("admin-manage-tickets", {
        body: { adminUserId, action: "swap-order", ticket: { id1, id2 } },
      });
      await loadTickets();
    } catch {}
  };

  return (
    <section className="space-y-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3"
      >
        <h2 className="text-foreground font-bold text-lg flex items-center gap-2">
          <Ticket className="w-5 h-5 text-primary" />
          Tickets
        </h2>
        {open ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </button>

      {open && (
        <div className="bg-card rounded-b-xl px-4 pb-4 pt-2 space-y-3 border border-t-0 border-border -mt-2 rounded-t-none">
          {loading ? (
            <p className="text-muted-foreground text-sm text-center py-4">Loading...</p>
          ) : (
            tickets.map((ticket, i) => {
              const edits = getEdit(ticket.id);
              const hasEdits = Object.keys(edits).length > 0;
              const displayName = (edits.name as string) ?? ticket.name;
              const displayUrl = (edits.url as string) ?? ticket.url ?? "";
              const displayPopup = (edits.popup_message as string) ?? ticket.popup_message ?? "";

              return (
                <div
                  key={ticket.id}
                  className={`border rounded-lg p-3 space-y-2 ${ticket.active ? "border-border" : "border-destructive/30 opacity-60"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      value={displayName}
                      onChange={(e) => setEdit(ticket.id, "name", e.target.value)}
                      className="flex-1 font-bold text-sm h-8"
                    />
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => handleSwap(i, "up")} disabled={i === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleSwap(i, "down")} disabled={i === tickets.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleToggleActive(ticket)} className="p-1 text-muted-foreground hover:text-foreground">
                        {ticket.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {ticket.type === "link" ? (
                    <Input
                      value={displayUrl}
                      onChange={(e) => setEdit(ticket.id, "url", e.target.value)}
                      placeholder="URL"
                      className="text-xs h-7"
                    />
                  ) : (
                    <Input
                      value={displayPopup}
                      onChange={(e) => setEdit(ticket.id, "popup_message", e.target.value)}
                      placeholder="Popup message"
                      className="text-xs h-7"
                    />
                  )}

                  {hasEdits && (
                    <button
                      onClick={() => handleSave(ticket)}
                      disabled={saving === ticket.id}
                      className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40"
                    >
                      {saving === ticket.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Save
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
};

export default AdminTicketsSection;
