export function BookSkeleton() {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center">
      <div className="w-full h-full max-w-6xl mx-auto flex flex-col items-center justify-center space-y-4">
        {/* Barre de navigation */}
        <div className="w-full h-12 bg-muted rounded animate-pulse" />

        {/* Page du livre */}
        <div className="w-full flex-1 bg-muted rounded animate-pulse" />

        {/* Barre de contrôles */}
        <div className="w-full h-16 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}
