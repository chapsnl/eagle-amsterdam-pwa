import { memo } from "react";
import { Calendar, Clock } from "lucide-react";
import { formatEventDate } from "@/lib/formatDate";
import EagleHtmlContent from "@/components/shared/EagleHtmlContent";
import type { EagleEvent } from "@/hooks/useEagleEvents";

interface EventCardProps {
  event: EagleEvent;
  isExpanded: boolean;
  onToggle: () => void;
}

const EventCard = memo(({ event, isExpanded, onToggle }: EventCardProps) => {
  const { dateStr, startTime, endTime } = formatEventDate(event.startTime, event.endTime);

  return (
    <div
      onClick={onToggle}
      className="group border border-border rounded-lg overflow-hidden bg-card hover:neon-border transition-all duration-300 cursor-pointer"
    >
      {event.imageUrl ? (
        <div className="w-full aspect-video bg-background">
          <img
            src={event.imageUrl}
            alt={event.title}
            loading="lazy"
            decoding="async"
            width={600}
            height={338}
            className="w-full h-full object-contain"
          />
        </div>
      ) : (
        <div className="w-full aspect-video bg-secondary flex items-center justify-center">
          <Calendar className="w-10 h-10 text-muted-foreground" />
        </div>
      )}
      <div className="p-4">
        <h3 className="font-display text-xl tracking-wider text-foreground group-hover:text-primary transition-colors">
          {event.title}
        </h3>
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
});

EventCard.displayName = "EventCard";

export default EventCard;
