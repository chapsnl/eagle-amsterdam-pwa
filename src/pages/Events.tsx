import { useState } from "react";
import { Ticket, ExternalLink } from "lucide-react";
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

interface TicketItem {
  name: string;
  type: "popup" | "link";
  url?: string;
  popupMessage?: string;
}

const tickets: TicketItem[] = [
  { name: "Bear Bash", type: "popup", popupMessage: "This is a free event" },
  { name: "Horsemen & Knights", type: "popup", popupMessage: "Tickets only at the door for 8 Euro" },
  { name: "NcAdam", type: "popup", popupMessage: "Tickets only at the door for 8 Euro" },
  { name: "Cum Hunks", type: "popup", popupMessage: "Tickets only at the door for 8 Euro" },
  { name: "Horse Fair", type: "popup", popupMessage: "Tickets only at the door for 12,50 Euro" },
  { name: "XXXFetish", type: "popup", popupMessage: "Tickets only at the door for 8 Euro" },
  { name: "Ready2Play", type: "link", url: "https://www.ready-2-play.nl/#tickets" },
  { name: "Sneaky", type: "link", url: "https://www.sneaky-the-party.com/#tickets" },
  { name: "The Meantime", type: "link", url: "https://www.themeantime.nl/#tickets" },
  { name: "Pup Unleashed", type: "link", url: "https://www.puppyunleashed.nl/#tickets" },
  { name: "Corner Time", type: "link", url: "https://www.cornertime.nl/#tickets" },
  { name: "XXXFetish", type: "link", url: "https://www.cornertime.nl/#tickets" },
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
    <div className="flex flex-col min-h-screen pb-20 pt-6 px-4 max-w-lg mx-auto">
      <h1 className="text-4xl font-display tracking-wider text-foreground mb-6 flex items-center gap-3">
        <Ticket className="w-7 h-7 text-primary" />
        TICKETS
      </h1>
      <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {tickets.map((ticket, i) => (
          <Button
            key={`${ticket.name}-${i}`}
            variant="eagle-outline"
            className="w-full justify-between h-auto py-4 text-left text-foreground"
            onClick={() => handleClick(ticket)}
          >
            <span>{ticket.name}</span>
            {ticket.type === "link" ? (
              <ExternalLink className="w-4 h-4 shrink-0 ml-2" />
            ) : (
              <Ticket className="w-4 h-4 shrink-0 ml-2" />
            )}
          </Button>
        ))}
      </div>

      <AlertDialog open={popupOpen} onOpenChange={setPopupOpen}>
        <AlertDialogContent className="bg-card border-border">
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
