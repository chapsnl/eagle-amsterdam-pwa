import { useState } from "react";
import {
  Ticket,
  ExternalLink,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import CardSkeletonList from "@/components/shared/CardSkeletonList";

interface TicketItem {
  id: string;
  name: string;
  type: "popup" | "link";
  url?: string | null;
  popup_message?: string | null;
  display_order: number;
}

const Events = () => {
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-tickets");
      if (error || !data?.success) throw new Error("Failed to fetch tickets");
      return data.tickets as TicketItem[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleClick = (ticket: TicketItem) => {
    if (ticket.type === "popup") {
      setPopupMessage(ticket.popup_message || "");
      setPopupOpen(true);
    } else if (ticket.url) {
      window.open(ticket.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-20 pt-8 px-4 max-w-lg mx-auto">
      <h1 className="text-4xl font-display tracking-wider text-foreground mb-6 flex items-center gap-3">
        <Ticket className="w-7 h-7 text-primary" />
        TICKETS
      </h1>

      {isLoading ? (
        <CardSkeletonList count={6} />
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {tickets.map((ticket) => (
            <button
              key={ticket.id}
              className="group relative flex flex-col items-center gap-3 rounded-lg border-2 border-border bg-secondary/50 py-6 px-4 text-foreground transition-all duration-300 active:border-primary active:bg-primary active:text-primary-foreground"
              onClick={() => handleClick(ticket)}
            >
              <Ticket className="w-7 h-7 text-primary transition-all duration-300 group-active:scale-110 group-active:text-primary-foreground" />
              <span className="font-display text-sm tracking-wider text-center leading-tight">
                {ticket.name}
              </span>
              <span className="absolute top-2 right-2">
                {ticket.type === "link" ? (
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <Ticket className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      <AlertDialog open={popupOpen} onOpenChange={setPopupOpen}>
        <AlertDialogContent className="bg-card border-border max-w-[calc(100vw-3rem)] sm:max-w-sm mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display tracking-wider text-foreground">
              Ticket Info
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {popupMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-primary text-primary-foreground hover:bg-primary/90">
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Events;
