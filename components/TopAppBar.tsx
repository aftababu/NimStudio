import { ModelSelector } from "./ModelSelector";
import { ProjectSelector } from "./ProjectSelector";

export function TopAppBar() {
  return (
    <header className="flex justify-between items-center w-full px-lg py-sm sticky top-0 z-40 bg-background border-b border-outline-variant h-[60px]">
      {/* Left: Model Selection Dropdowns */}
      <div className="flex items-center gap-md">
        <ModelSelector />
        <ProjectSelector />
      </div>
      {/* Right: Actions */}
      {/* <div className="flex items-center gap-sm">
        <button className="p-xs text-on-surface-variant hover:text-primary transition-colors hover:scale-95 duration-200">
          <span className="material-symbols-outlined">account_circle</span>
        </button>
        <button className="p-xs text-on-surface-variant hover:text-primary transition-colors hover:scale-95 duration-200">
          <span className="material-symbols-outlined">more_vert</span>
        </button>
      </div> */}
    </header>
  );
}
