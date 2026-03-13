import { Newspaper, ExternalLink } from "lucide-react";
import { useEaglePosts } from "@/hooks/useEaglePosts";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const News = () => {
  const { data: posts, isLoading, error } = useEaglePosts();

  return (
    <div className="flex flex-col min-h-screen pb-20 pt-6 px-4 max-w-lg mx-auto">
      <h1 className="text-4xl font-display tracking-wider text-foreground mb-6 flex items-center gap-3">
        <Newspaper className="w-7 h-7 text-primary" />
        NEWS
      </h1>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-44 w-full" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <div className="border border-destructive/50 rounded-lg p-6 text-center">
          <p className="text-destructive text-sm">Could not load news. Please try again later.</p>
        </div>
      )}

      {posts && posts.length === 0 && (
        <div className="border border-border border-dashed rounded-lg p-8 flex items-center justify-center">
          <p className="text-muted-foreground text-sm text-center">No news posts available.</p>
        </div>
      )}

      {posts && posts.length > 0 && (
        <div className="space-y-4">
          {posts.map((post) => (
            <a
              key={post.id}
              href={post.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
            >
              <Card className="overflow-hidden transition-colors hover:border-primary/50">
                {post.imageUrl && (
                  <div className="relative h-44 w-full overflow-hidden">
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                )}
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    {format(new Date(post.date), "d MMMM yyyy")}
                  </p>
                  <h2 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors flex items-center gap-1.5">
                    {post.title}
                    <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </h2>
                  {post.excerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {post.excerpt}
                    </p>
                  )}
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default News;
