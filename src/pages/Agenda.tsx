import { Calendar } from "lucide-react";

const placeholderEvents = [
  { id: 1, title: "Leather Night", date: "Fri, Mar 14", time: "22:00 – 04:00" },
  { id: 2, title: "Undressed Sunday", date: "Sun, Mar 16", time: "16:00 – 22:00" },
  { id: 3, title: "Dirty Eagle", date: "Sat, Mar 22", time: "22:00 – 05:00" },
  { id: 4, title: "Full Fetish Friday", date: "Fri, Mar 28", time: "22:00 – 04:00" },
];

const Agenda = () => (
  <div className="flex flex-col min-h-screen pb-20 pt-6 px-4 max-w-lg mx-auto">
    <h1 className="text-4xl font-display tracking-wider text-foreground mb-6 flex items-center gap-3">
      <Calendar className="w-7 h-7 text-primary" />
      AGENDA
    </h1>
    <p className="text-muted-foreground text-sm mb-6">
      Events will sync live from Eagle Amsterdam once the EventON API is
      connected. Below are placeholders.
    </p>
    <div className="flex flex-col gap-3">
      {placeholderEvents.map((event) => (
        <div
          key={event.id}
          className="border border-border rounded-lg p-4 bg-card hover:neon-border transition-all duration-300"
        >
          <h3 className="font-display text-xl tracking-wider text-foreground">
            {event.title}
          </h3>
          <div className="flex items-center gap-4 mt-2 text-muted-foreground text-xs">
            <span>{event.date}</span>
            <span>{event.time}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default Agenda;
