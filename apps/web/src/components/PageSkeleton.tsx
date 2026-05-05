export function PageSkeleton() {
  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-3">
          <div className="h-8 w-64 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-4 w-32 bg-gray-50 rounded-lg animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-gray-100 rounded-lg animate-pulse" />
      </div>

      {/* Content Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-72 bg-gray-50/50 border border-gray-100 rounded-2xl p-6 space-y-4">
            <div className="h-6 w-1/2 bg-gray-100 rounded-md animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-gray-50 rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-gray-50 rounded animate-pulse" />
            </div>
            <div className="mt-auto pt-12 flex gap-2">
              <div className="h-8 w-8 bg-gray-100 rounded-full animate-pulse" />
              <div className="h-8 w-8 bg-gray-100 rounded-full animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Large Block Skeleton */}
      <div className="h-96 bg-gray-50/30 border border-gray-100 rounded-2xl animate-pulse" />
    </div>
  );
}
