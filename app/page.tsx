import { SideNavBar } from "@/components/SideNavBar";
import { TopAppBar } from "@/components/TopAppBar";
import { ChatFeed } from "@/components/ChatFeed";
import { MessageInput } from "@/components/MessageInput";

export default function Home() {
  return (
    <>
      <SideNavBar />
      <main className="flex-1 flex flex-col h-full bg-background relative transition-[margin-left] duration-0" style={{ marginLeft: 'var(--sidebar-width, 250px)' }}>
        <TopAppBar />
        <ChatFeed />
        <MessageInput />
      </main>
    </>
  );
}
