import { useState } from "react";
import {
  Ticket,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { LucideIcon } from "lucide-react";

interface TicketItem {
  name: string;
  type: "popup" | "link";
  url?: string;
  popupMessage?: string;
  icon: LucideIcon;
}

const tickets: TicketItem[] = [
  { name: "Bear Bash", type: "popup", popupMessage: "This is a free event", icon: Ticket },
  { name: "Horsemen & Knights", type: "popup", popupMessage: "Tickets only at the door for 8 Euro", icon: Ticket },
  { name: "NcAdam", type: "popup", popupMessage: "Tickets only at the door for 8 Euro", icon: Ticket },
  { name: "Cum Hunks", type: "popup", popupMessage: "Tickets only at the door for 8 Euro", icon: Ticket },
  { name: "Horse Fair", type: "popup", popupMessage: "Tickets only at the door for 12,50 Euro", icon: Ticket },
  { name: "XXXFetish", type: "popup", popupMessage: "Tickets only at the door for 8 Euro", icon: Ticket },
  { name: "Ready2Play", type: "link", url: "https://www.ready-2-play.nl/#tickets", icon: Ticket },
  { name: "Sneaky", type: "link", url: "https://www.sneaky-the-party.com/#tickets", icon: Ticket },
  { name: "The Meantime", type: "link", url: "https://www.themeantime.nl/#tickets", icon: Ticket },
  { name: "Pup Unleashed", type: "link", url: "https://www.puppyunleashed.nl/#tickets", icon: Ticket },
  { name: "Corner Time", type: "link", url: "https://www.cornertime.nl/#tickets", icon: Ticket },
  { name: "XXXFetish", type: "link", url: "https://www.cornertime.nl/#tickets", icon: Ticket },
];

const Events = () => {
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");

  const handleClick = (ticket: TicketItem) => {
    if (ticket.type === "popup") {
      setPopupMessage(ticket.popupMessage || "");
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
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {tickets.map((ticket, i) => {
          const Icon = ticket.icon;
          return (
            <button
              key={`${ticket.name}-${i}`}
              className="group relative flex flex-col items-center gap-3 rounded-lg border-2 border-border bg-secondary/50 py-6 px-4 text-foreground transition-all duration-300 hover:border-primary hover:bg-primary hover:text-primary-foreground"
              onClick={() => handleClick(ticket)}
            >
              <Icon className="w-7 h-7 text-primary transition-transform duration-300 group-hover:scale-110" />
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
          );
        })}
      </div>

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
