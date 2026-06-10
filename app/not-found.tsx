import Link from "next/link";

export default function NotFound() {
  return (
    <div className="w-full h-full bg-background flex flex-col items-center justify-center p-lg relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-md w-full flex flex-col items-center text-center relative z-10 gap-md">
        <div className="w-24 h-24 bg-surface rounded-3xl border border-outline-variant flex items-center justify-center mb-md shadow-2xl relative">
          <div className="absolute inset-0 bg-primary/10 rounded-3xl blur-xl"></div>
          <span className="material-symbols-outlined text-[48px] text-primary-container relative z-10">
            sentiment_dissatisfied
          </span>
        </div>

        <h1 className="text-5xl font-bold text-on-surface tracking-tight">
          404
        </h1>

        <div className="space-y-xs">
          <h2 className="text-xl font-medium text-on-surface whitespace-nowrap">
            Page Not Found
          </h2>
          <p className="text-on-surface-variant text-sm max-w-[280px] mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
        </div>

        <Link
          href="/"
          className="whitespace-nowrap mt-lg flex items-center gap-sm px-xl py-md bg-primary hover:bg-primary/90 text-on-primary rounded-full font-medium transition-all shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0"
        >
          <span className="material-symbols-outlined text-[20px]">home</span>
          Back to Workspace
        </Link>
      </div>
    </div>
  );
}
