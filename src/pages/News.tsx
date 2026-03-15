import { Newspaper } from "lucide-react";
import { useEaglePosts } from "@/hooks/useEaglePosts";
import { format } from "date-fns";
import { useState } from "react";
import EagleHtmlContent from "@/components/shared/EagleHtmlContent";
import PullToRefresh from "@/components/shared/PullToRefresh";
import FirstVisitLoader from "@/components/shared/FirstVisitLoader";

const News = () => {
  const { data: posts, isLoading, error, forceRefresh, isFetching, isPlaceholderData } = useEaglePosts();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const hasCachedPosts = typeof window !== "undefined" && !!localStorage.getItem("eagle-posts-cache");
  const showFirstVisitLoader = isLoading && !hasCachedPosts;

  return (
    <PullToRefresh onRefresh={forceRefresh}>
      <div className="flex flex-col min-h-screen pb-20 pt-8 px-4 max-w-lg mx-auto relative">
        {isFetching && isPlaceholderData && (
          <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-primary/30 overflow-hidden">
            <div className="h-full w-1/3 bg-primary animate-[slide_1s_ease-in-out_infinite]" />
          </div>
        )}
        <h1 className="text-4xl font-display tracking-wider text-foreground mb-6 flex items-center gap-3">
          <Newspaper className="w-7 h-7 text-primary" />
          NEWS
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          Latest news from Eagle Amsterdam.
        </p>

        {showFirstVisitLoader && <FirstVisitLoader />}

        {error && (
          <div className="border border-destructive/50 rounded-lg p-4 bg-destructive/10 text-destructive">
            <p className="font-semibold">Failed to load news</p>
            <p className="text-sm mt-1">Please try again later.</p>
          </div>
        )}

        {posts && posts.length === 0 && !isLoading && (
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
                      decoding="async"
                      width={600}
                      height={240}
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
                      <EagleHtmlContent html={post.content} className="text-sm mt-2 blog-content-fix" />
                    ) : (
                      <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
                        {post.excerpt.length > 150 ? post.excerpt.slice(0, 150) + "…" : post.excerpt}
                      </p>
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

export default News;
