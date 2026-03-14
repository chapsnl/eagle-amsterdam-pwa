import { useState } from "react";
import { Calendar, Clock } from "lucide-react";
import { useEagleEvents } from "@/hooks/useEagleEvents";
import EagleHtmlContent from "@/components/EagleHtmlContent";
import PullToRefresh from "@/components/PullToRefresh";
import { Skeleton } from "@/components/ui/skeleton";

const TZ = "Europe/Amsterdam";

function formatEventDate(startUnix: number, endUnix: number) {
  const start = new Date(startUnix * 1000);
  const end = new Date(endUnix * 1000);

  const dateFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" });
  const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
  const dayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric" });

  const dateStr = dateFmt.format(start);
  const startTime = timeFmt.format(start);
  const endTimeStr = timeFmt.format(end);
  const sameDay = dayFmt.format(start) === dayFmt.format(end);
  const endDateSuffix = sameDay ? "" : ` (${dayFmt.format(end)})`;

  return { dateStr, startTime, endTime: `${endTimeStr}${endDateSuffix}` };
}

const Agenda = () => {
  const { data: events, isLoading, isError, error, forceRefresh } = useEagleEvents();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <PullToRefresh onRefresh={forceRefresh}>
      <div className="flex flex-col min-h-screen pb-20 pt-8 px-4 max-w-lg mx-auto">
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
              const isExpanded = expandedId === event.id;
              return (
                <div
                  key={event.id}
                  onClick={() => setExpandedId(isExpanded ? null : event.id)}
                  className="group border border-border rounded-lg overflow-hidden bg-card hover:neon-border transition-all duration-300 cursor-pointer"
                >
                  {event.imageUrl ? (
                    <img
                      src={event.imageUrl}
                      alt={event.title}
                      loading="lazy"
                      decoding="async"
                      width={600}
                      height={240}
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
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-primary font-semibold text-sm">{dateStr}</span>
                      <span className="flex items-center gap-1 text-muted-foreground text-xs">
                        <Clock className="w-3 h-3" />
                        {startTime} – {endTime}
                      </span>
                    </div>
                    {isExpanded ? (
                      event.description ? (
                        <EagleHtmlContent html={event.description} className="text-sm mt-2" />
                      ) : (
                        <p className="text-muted-foreground text-sm mt-2">No additional details available.</p>
                      )
                    ) : (
                      event.description && (
                        <EagleHtmlContent html={event.description} className="text-sm mt-2 line-clamp-2" />
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
};

export default Agenda;
