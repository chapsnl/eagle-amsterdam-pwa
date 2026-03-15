import { useState } from "react";
import { Calendar } from "lucide-react";
import { useEagleEvents } from "@/hooks/useEagleEvents";
import PullToRefresh from "@/components/shared/PullToRefresh";
import EventCard from "@/components/agenda/EventCard";
import FirstVisitLoader from "@/components/shared/FirstVisitLoader";

const Agenda = () => {
  const { data: events, isLoading, isError, error, forceRefresh, isFetching, isPlaceholderData } = useEagleEvents();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const hasCachedEvents = typeof window !== "undefined" && !!localStorage.getItem("eagle-events-cache");
  const showFirstVisitLoader = isLoading && !hasCachedEvents;

  return (
    <PullToRefresh onRefresh={forceRefresh}>
      <div className="flex flex-col min-h-screen pb-20 pt-8 px-4 max-w-lg mx-auto relative">
        {isFetching && isPlaceholderData && (
          <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-primary/30 overflow-hidden">
            <div className="h-full w-1/3 bg-primary animate-[slide_1s_ease-in-out_infinite]" />
          </div>
        )}
        <h1 className="text-4xl font-display tracking-wider text-foreground mb-6 flex items-center gap-3">
          <Calendar className="w-7 h-7 text-primary" />
          AGENDA
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          Upcoming events at Eagle Amsterdam.
        </p>

        {showFirstVisitLoader && <FirstVisitLoader />}

        {isError && (
          <div className="border border-destructive/50 rounded-lg p-4 bg-destructive/10 text-destructive">
            <p className="font-semibold">Failed to load events</p>
            <p className="text-sm mt-1">{(error as Error)?.message || "Please try again later."}</p>
          </div>
        )}

        {events && events.length === 0 && !isLoading && (
          <p className="text-muted-foreground text-center py-12">No upcoming events found.</p>
        )}

        {events && events.length > 0 && (
          <div className="flex flex-col gap-4">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isExpanded={expandedId === event.id}
                onToggle={() => setExpandedId(expandedId === event.id ? null : event.id)}
              />
            ))}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
};

export default Agenda;
