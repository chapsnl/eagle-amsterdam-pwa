import { useState } from "react";
import {
  Ticket,
  ExternalLink,
  Calendar,
  Clock,
  Loader2,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useTicketsoftEvents, type TicketsoftEvent, type TicketsoftTicket } from "@/hooks/useTicketsoftEvents";
import { supabase } from "@/integrations/supabase/client";

const TZ = "Europe/Amsterdam";

function formatDate(iso: string) {
  const d = new Date(iso);
  const dateFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeFmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return { date: dateFmt.format(d), time: timeFmt.format(d) };
}

function formatPrice(price: string) {
  const num = parseFloat(price);
  if (isNaN(num) || num === 0) return "Free";
  return `€${num.toFixed(2).replace(".", ",")}`;
}

const Events = () => {
  const { data: events, isLoading, isError } = useTicketsoftEvents();
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState<TicketsoftEvent | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  const handleBuyTicket = async (event: TicketsoftEvent, ticket: TicketsoftTicket) => {
    // If event has a shopUrl, just redirect there
    if (event.shopUrl) {
      window.open(event.shopUrl, "_blank", "noopener,noreferrer");
      return;
    }

    setCheckingOut(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-ticketsoft-cart", {
        body: {
          eventUuid: event.uuid,
          tickets: [{ ticketUuid: ticket.uuid, amount: 1 }],
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Failed to create cart");
      }

      if (data?.checkoutUrl) {
        window.open(data.checkoutUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      toast({
        title: "Error",
        description: (err as Error).message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setCheckingOut(false);
    }
  };

  // Filter to only sellable events with future dates
  const activeEvents = events?.filter(
    (e) => e.eligibleForSelling && new Date(e.details.end) > new Date()
  ) ?? [];

  return (
    <div className="flex flex-col min-h-screen pb-20 pt-8 px-4 max-w-lg mx-auto">
      <h1 className="text-4xl font-display tracking-wider text-foreground mb-2 flex items-center gap-3">
        <Ticket className="w-7 h-7 text-primary" />
        TICKETS
      </h1>
      <p className="text-muted-foreground text-sm mb-6">
        Buy tickets for upcoming Eagle Amsterdam events.
      </p>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border border-border rounded-lg overflow-hidden bg-card">
              <Skeleton className="w-full h-40" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="border border-destructive/50 rounded-lg p-4 bg-destructive/10 text-destructive">
          <p className="font-semibold">Failed to load events</p>
          <p className="text-sm mt-1">Please try again later.</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && activeEvents.length === 0 && (
        <p className="text-muted-foreground text-center py-12">
          No upcoming ticketed events at the moment.
        </p>
      )}

      {/* Event list */}
      {activeEvents.length > 0 && (
        <div className="flex flex-col gap-4">
          {activeEvents.map((event) => {
            const start = formatDate(event.details.start);
            const end = formatDate(event.details.end);
            const lowestPrice = event.tickets
              .filter((t) => t.visible && t.remainingTickets > 0)
              .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))[0];

            return (
              <div
                key={event.uuid}
                className="group border border-border rounded-lg overflow-hidden bg-card hover:neon-border transition-all duration-300"
              >
                {/* Event image */}
                {event.brand?.backgroundImageUrl && (
                  <img
                    src={event.brand.backgroundImageUrl}
                    alt={event.name}
                    loading="lazy"
                    decoding="async"
                    width={600}
                    height={240}
                    className="w-full h-40 object-cover object-top"
                  />
                )}

                <div className="p-4">
                  {/* Name */}
                  <h3 className="font-display text-xl tracking-wider text-foreground group-hover:text-primary transition-colors">
                    {event.name}
                  </h3>

                  {/* Date & time */}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-primary font-semibold text-sm">
                      <Calendar className="w-3.5 h-3.5" />
                      {start.date}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground text-xs">
                      <Clock className="w-3 h-3" />
                      {start.time} – {end.time}
                    </span>
                  </div>

                  {/* Price */}
                  {lowestPrice && (
                    <p className="text-foreground text-sm font-bold mt-2">
                      {formatPrice(lowestPrice.price)}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    {event.tickets.filter((t) => t.visible && t.remainingTickets > 0).length > 1 ? (
                      <Button
                        variant="eagle"
                        size="sm"
                        className="flex-1"
                        onClick={() => setSelectedEvent(event)}
                      >
                        <ShoppingCart className="w-4 h-4 mr-1.5" />
                        Buy Ticket
                      </Button>
                    ) : lowestPrice ? (
                      <Button
                        variant="eagle"
                        size="sm"
                        className="flex-1"
                        disabled={checkingOut}
                        onClick={() => handleBuyTicket(event, lowestPrice)}
                      >
                        {checkingOut ? (
                          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : (
                          <ShoppingCart className="w-4 h-4 mr-1.5" />
                        )}
                        Buy Ticket
                      </Button>
                    ) : event.shopUrl ? (
                      <Button
                        variant="eagle"
                        size="sm"
                        className="flex-1"
                        onClick={() =>
                          window.open(event.shopUrl, "_blank", "noopener,noreferrer")
                        }
                      >
                        <ExternalLink className="w-4 h-4 mr-1.5" />
                        Buy Ticket
                      </Button>
                    ) : (
                      <p className="text-muted-foreground text-xs italic mt-1">
                        Tickets not yet available
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ticket selection dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-[400px] w-[90%] rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Ticket className="w-5 h-5 text-primary" />
              {selectedEvent?.name}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Select a ticket type
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            {selectedEvent?.tickets
              .filter((t) => t.visible && t.remainingTickets > 0)
              .map((ticket) => (
                <button
                  key={ticket.uuid}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary hover:border-primary hover:bg-primary/10 transition-all"
                  onClick={() => {
                    setSelectedEvent(null);
                    handleBuyTicket(selectedEvent!, ticket);
                  }}
                  disabled={checkingOut}
                >
                  <div className="text-left">
                    <p className="text-foreground text-sm font-semibold">{ticket.name}</p>
                    {ticket.description && (
                      <p className="text-muted-foreground text-xs mt-0.5">{ticket.description}</p>
                    )}
                  </div>
                  <span className="text-primary font-bold text-sm shrink-0 ml-3">
                    {formatPrice(ticket.price)}
                  </span>
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Events;
