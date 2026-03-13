import { Tags } from "lucide-react";

const categories = [
  { name: "Leather Night", description: "Classic dress code evening" },
  { name: "Undressed", description: "Underwear & naked party" },
  { name: "Dirty Eagle", description: "Fetish & kink themed" },
  { name: "Full Fetish Friday", description: "Strict fetish dress code" },
  { name: "Bear Night", description: "Bears, cubs & admirers" },
];

const Events = () => (
  <div className="flex flex-col min-h-screen pb-20 pt-6 px-4 max-w-lg mx-auto">
    <h1 className="text-4xl font-display tracking-wider text-foreground mb-6 flex items-center gap-3">
      <Tags className="w-7 h-7 text-primary" />
      EVENT CATEGORIES
    </h1>
    <div className="flex flex-col gap-3">
      {categories.map((cat) => (
        <div
          key={cat.name}
          className="border border-border rounded-lg p-4 bg-card hover:neon-border transition-all duration-300 cursor-pointer"
        >
          <h3 className="font-display text-xl tracking-wider text-foreground">
            {cat.name}
          </h3>
          <p className="text-muted-foreground text-xs mt-1">{cat.description}</p>
        </div>
      ))}
    </div>
  </div>
);

export default Events;
