import React from 'react';

export function PageSkeleton() {
  return (
    <div className="p-8 space-y-8 animate-pulse max-w-[1400px] mx-auto">
      {/* Header Skeleton */}
      <div className="space-y-3">
        <div className="h-8 w-64 bg-gray-200 rounded-lg" />
        <div className="h-4 w-96 bg-gray-100 rounded-lg" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-4 p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-6 w-6 bg-gray-100 rounded-full" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-gray-100 rounded" />
              <div className="h-4 w-2/3 bg-gray-50 rounded" />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <div className="h-6 w-6 bg-gray-200 rounded-full" />
              <div className="h-3 w-32 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div className="flex gap-6 p-8 overflow-hidden animate-pulse min-h-[calc(100vh-80px)]">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-80 space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="h-5 w-32 bg-gray-200 rounded" />
            <div className="h-5 w-8 bg-gray-100 rounded-full" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-32 bg-white border border-gray-100 rounded-xl shadow-sm" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
