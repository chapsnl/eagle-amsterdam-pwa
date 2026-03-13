import { Newspaper } from "lucide-react";
import { useEaglePosts } from "@/hooks/useEaglePosts";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useState } from "react";
import EagleHtmlContent from "@/components/EagleHtmlContent";


const News = () => {
  const { data: posts, isLoading, error } = useEaglePosts();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div className="flex flex-col min-h-screen pb-20 pt-6 px-4 max-w-lg mx-auto">
      <h1 className="text-4xl font-display tracking-wider text-foreground mb-6 flex items-center gap-3">
        <Newspaper className="w-7 h-7 text-primary" />
        NEWS
      </h1>
      <p className="text-muted-foreground text-sm mb-6">
        Latest news from Eagle Amsterdam.
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

      {error && (
        <div className="border border-destructive/50 rounded-lg p-4 bg-destructive/10 text-destructive">
          <p className="font-semibold">Failed to load news</p>
          <p className="text-sm mt-1">Please try again later.</p>
        </div>
      )}

      {posts && posts.length === 0 && (
        <p className="text-muted-foreground text-center py-12">No news posts available.</p>
      )}

      {posts && posts.length > 0 && (
        <div className="flex flex-col gap-4">
          {posts.map((post) => {
            const isExpanded = expandedId === post.id;
            return (
              <div
                key={post.id}
                onClick={() => setExpandedId(isExpanded ? null : post.id)}
                className="group border border-border rounded-lg overflow-hidden bg-card hover:neon-border transition-all duration-300 cursor-pointer"
              >
                {post.imageUrl && (
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    loading="lazy"
                    className="w-full h-40 object-cover"
                  />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-xl tracking-wider text-foreground group-hover:text-primary transition-colors">
                      {post.title}
                    </h3>
                    <span className="text-primary text-xs mt-1 shrink-0">
                      News Posted: {format(new Date(post.date), "MMM d, yyyy")}
                    </span>
                  </div>
                  {isExpanded ? (
                    <EagleHtmlContent html={post.content} className="text-sm mt-2" />
                  ) : (
                    <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
                      {post.excerpt.length > 150 ? post.excerpt.slice(0, 150) + '…' : post.excerpt}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default News;
