import { useState } from "react";
import { Calendar, Clock, ChevronRight, X } from "lucide-react";
import { useEagleEvents } from "@/hooks/useEagleEvents";
import { EagleEvent } from "@/hooks/useEagleEvents";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";

const ONE_HOUR = 3600;

function formatEventDate(startUnix: number, endUnix: number) {
  const start = new Date((startUnix - ONE_HOUR) * 1000);
  const end = new Date((endUnix - ONE_HOUR) * 1000);
  const dateStr = format(start, "EEE, MMM d");
  const startTime = format(start, "HH:mm");
  const endTime = format(end, "HH:mm");
  const sameDay = start.toDateString() === end.toDateString();
  const endDateStr = sameDay ? "" : ` (${format(end, "d")})`;
  return { dateStr, startTime, endTime: `${endTime}${endDateStr}` };
}

const Agenda = () => {
  const { data: events, isLoading, isError, error } = useEagleEvents();
  const [selected, setSelected] = useState<EagleEvent | null>(null);

  const selectedDate = selected ? formatEventDate(selected.startTime, selected.endTime) : null;

  return (
    <div className="flex flex-col min-h-screen pb-20 pt-6 px-4 max-w-lg mx-auto">
      <h1 className="text-4xl font-display tracking-wider text-foreground mb-6 flex items-center gap-3">
        <Calendar className="w-7 h-7 text-primary" />
        AGENDA
      </h1>
      <p className="text-muted-foreground text-sm mb-6">
        Upcoming events at Eagle Amsterdam.
      </p>

      {isLoading && (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-border rounded-lg overflow-hidden bg-card">
              <Skeleton className="w-full h-40" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="border border-destructive/50 rounded-lg p-4 bg-destructive/10 text-destructive">
          <p className="font-semibold">Failed to load events</p>
          <p className="text-sm mt-1">{(error as Error)?.message || "Please try again later."}</p>
        </div>
      )}

      {events && events.length === 0 && (
        <p className="text-muted-foreground text-center py-12">No upcoming events found.</p>
      )}

      {events && events.length > 0 && (
        <div className="flex flex-col gap-4">
          {events.map((event) => {
            const { dateStr, startTime, endTime } = formatEventDate(event.startTime, event.endTime);
            return (
              <button
                key={event.id}
                onClick={() => setSelected(event)}
                className="group border border-border rounded-lg overflow-hidden bg-card hover:neon-border transition-all duration-300 block text-left w-full"
              >
                {event.imageUrl ? (
                  <img
                    src={event.imageUrl}
                    alt={event.title}
                    loading="lazy"
                    className="w-full h-40 object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-40 bg-secondary flex items-center justify-center">
                    <Calendar className="w-10 h-10 text-muted-foreground" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-xl tracking-wider text-foreground group-hover:text-primary transition-colors">
                      {event.title}
                    </h3>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-primary font-semibold text-sm">{dateStr}</span>
                    <span className="flex items-center gap-1 text-muted-foreground text-xs">
                      <Clock className="w-3 h-3" />
                      {startTime} – {endTime}
                    </span>
                  </div>
                  {event.description && (
                    <div
                      className="prose prose-invert prose-red max-w-none text-foreground blog-content text-sm mt-2 line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: event.description }}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Event Detail Modal */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border p-0">
          {selected && (
            <>
              {selected.imageUrl && (
                <img
                  src={selected.imageUrl}
                  alt={selected.title}
                  className="w-full h-56 object-cover object-top rounded-t-lg"
                />
              )}
              <div className="p-6">
                <DialogHeader>
                  <DialogTitle className="font-display text-2xl tracking-wider text-foreground">
                    {selected.title}
                  </DialogTitle>
                  <DialogDescription asChild>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-primary font-semibold text-sm">{selectedDate?.dateStr}</span>
                      <span className="flex items-center gap-1 text-muted-foreground text-xs">
                        <Clock className="w-3 h-3" />
                        {selectedDate?.startTime} – {selectedDate?.endTime}
                      </span>
                    </div>
                  </DialogDescription>
                </DialogHeader>
                {selected.description && (
                  <div
                    className="prose prose-invert prose-red max-w-none text-foreground blog-content text-sm mt-4"
                    dangerouslySetInnerHTML={{ __html: selected.description }}
                  />
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Agenda;
