import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface CardSkeletonListProps {
  count?: number;
}

const CardSkeletonList = memo(({ count = 4 }: CardSkeletonListProps) => (
  <div className="flex flex-col gap-4">
    {Array.from({ length: count }).map((_, i) => (
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
));

CardSkeletonList.displayName = "CardSkeletonList";

export default CardSkeletonList;
