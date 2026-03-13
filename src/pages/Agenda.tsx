import { Calendar, ExternalLink, Clock } from "lucide-react";
import { useEagleEvents } from "@/hooks/useEagleEvents";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import parse from "html-react-parser";

const ONE_HOUR = 3600; // seconds

function formatEventDate(startUnix: number, endUnix: number) {
  // Subtract 1 hour from both start and end times
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
              <a
                key={event.id}
                href={event.link || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="group border border-border rounded-lg overflow-hidden bg-card hover:neon-border transition-all duration-300 block"
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
                    <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-primary font-semibold text-sm">{dateStr}</span>
                    <span className="flex items-center gap-1 text-muted-foreground text-xs">
                      <Clock className="w-3 h-3" />
                      {startTime} – {endTime}
                    </span>
                  </div>
                  {event.description && (
                    <div className="prose prose-invert max-w-none blog-content text-sm mt-2 line-clamp-2">
                      {parse(event.description)}
                    </div>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Agenda;
