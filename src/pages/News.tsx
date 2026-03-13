import { Newspaper } from "lucide-react";

const News = () => (
  <div className="flex flex-col min-h-screen pb-20 pt-6 px-4 max-w-lg mx-auto">
    <h1 className="text-4xl font-display tracking-wider text-foreground mb-6 flex items-center gap-3">
      <Newspaper className="w-7 h-7 text-primary" />
      NEWS
    </h1>
    <p className="text-muted-foreground text-sm mb-6">
      Latest news and updates from Eagle Amsterdam will appear here.
    </p>
    <div className="border border-border border-dashed rounded-lg p-8 flex items-center justify-center">
      <p className="text-muted-foreground text-sm text-center">
        News feed coming soon — will be connected to eagleamsterdam.com
      </p>
    </div>
  </div>
);

export default News;
