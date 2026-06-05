"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SideNavBar } from "@/components/SideNavBar";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { name: "General", href: "/settings", icon: "settings" },
    { name: "API Keys", href: "/settings/api-keys", icon: "key" },
    { name: "Global Rules", href: "/settings/rules", icon: "rule" },
  ];

  return (
    <>
      <SideNavBar />
      <main className="flex-1 flex flex-col h-full bg-[#0A0A0A] relative transition-[margin-left] duration-0" style={{ marginLeft: 'var(--sidebar-width, 250px)' }}>
        {/* Top Header */}
        <header className="h-[60px] border-b border-outline-variant flex items-center px-lg bg-[#0A0A0A] sticky top-0 z-10">
          <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Settings</h2>
        </header>

        <div className="flex-1 overflow-hidden flex">
          {/* Settings Secondary Navigation */}
          <aside className="w-[240px] border-r border-outline-variant bg-[#0A0A0A] p-md flex flex-col gap-xs overflow-y-auto hidden md:flex">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-sm px-md py-sm rounded-md transition-colors duration-200 border ${
                    isActive 
                      ? "bg-[#171717] border-outline-variant text-primary font-medium" 
                      : "border-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                  <span className="text-[14px]">{tab.name}</span>
                </Link>
              );
            })}
          </aside>

          {/* Settings Content Area */}
          <section className="flex-1 overflow-y-auto p-xl custom-scrollbar relative">
            <div className="max-w-4xl mx-auto">
              {children}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
