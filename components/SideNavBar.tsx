"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useChatStore } from "../lib/store";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

function SideNavBarContent() {
  const { activeConversationId, setActiveConversationId, setStreamingContent, sidebarWidth, setSidebarWidth } = useChatStore();
  const [isConversationsExpanded, setIsConversationsExpanded] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDragging = useRef(false);

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
  }, [sidebarWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      if (window.innerWidth < 1024) return;
      
      const max = window.innerWidth * 0.4;
      let newWidth = e.clientX;
      if (newWidth < 250) newWidth = 250;
      if (newWidth > max) newWidth = max;
      
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = 'default';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [setSidebarWidth]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.innerWidth < 1024) return;
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
  };

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setActiveConversationId(id);
    } else {
      setActiveConversationId(null);
    }
  }, [searchParams, setActiveConversationId]);

  const { data, isLoading } = useQuery<{ conversations: Conversation[] }>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/api/chat/conversations');
      if (!res.ok) throw new Error('Failed to fetch conversations');
      return res.json();
    }
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string, title: string }) => {
      const res = await fetch(`http://localhost:3001/api/chat/conversations/${encodeURIComponent(id)}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      if (!res.ok) throw new Error('Failed to rename conversation');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`http://localhost:3001/api/chat/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete conversation');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] })
  });

  const conversations = data?.conversations || [];

  const handleNewChat = () => {
    router.push('/');
  };

  const handleRename = (id: string, currentTitle: string) => {
    const newTitle = window.prompt("Enter new chat title:", currentTitle);
    if (newTitle && newTitle.trim() !== currentTitle) {
      renameMutation.mutate({ id, title: newTitle.trim() });
    }
    setActiveMenuId(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this conversation?")) {
      deleteMutation.mutate(id);
      if (activeConversationId === id) {
        setActiveConversationId(null);
        router.push('/');
      }
    }
    setActiveMenuId(null);
  };

  const handleSidebarClick = () => {
    if (activeMenuId) setActiveMenuId(null);
  };

  return (
    <aside 
      onClick={handleSidebarClick}
      className="h-full border-r border-outline-variant bg-surface-container-low dark:bg-surface-container-low flex flex-col fixed left-0 top-0 overflow-y-auto z-50 flex-shrink-0 transition-[width] duration-0"
      style={{ width: 'var(--sidebar-width, 250px)' }}
    >
      <div 
        onMouseDown={handleMouseDown}
        className="absolute right-0 top-0 w-1.5 h-full cursor-col-resize hover:bg-primary/50 z-[100] transition-colors"
      />

      {/* Header / Logo area */}
      <div className="p-md border-b border-outline-variant flex items-center gap-sm">
        <div className="w-8 h-8 rounded-DEFAULT bg-primary flex items-center justify-center text-on-primary">
          <span className="material-symbols-outlined text-[18px]">terminal</span>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight truncate">
            NimStudio
          </h1>
          <p className="font-label-caps text-label-caps text-on-surface-variant uppercase truncate">
            AI Workspace
          </p>
        </div>
      </div>

      {/* New Chat CTA */}
      <div className="p-md border-b border-outline-variant">
        <button 
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-sm py-sm px-md border border-outline-variant rounded-DEFAULT hover:border-primary-container hover:text-primary-container transition-colors duration-150 group"
        >
          <span className="material-symbols-outlined text-[18px] group-hover:text-primary-container">
            add_circle
          </span>
          <span className="font-body-md text-body-md font-medium truncate">New Chat</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex-1 overflow-y-auto px-sm py-sm flex flex-col gap-[2px] custom-scrollbar">
        
        <button
          onClick={() => setIsConversationsExpanded(!isConversationsExpanded)}
          className="flex items-center gap-sm px-sm py-xs rounded-DEFAULT text-on-surface-variant hover:text-on-surface transition-colors duration-150 group w-full text-left"
        >
          <span className="material-symbols-outlined text-[18px]">history</span>
          <span className="truncate font-body-md text-[15px] flex-1">Recent Conversations</span>
          <span className="material-symbols-outlined text-[18px]">
            {isConversationsExpanded ? 'expand_less' : 'expand_more'}
          </span>
        </button>

        {isConversationsExpanded && (
          <div className="flex flex-col gap-[2px] mt-xs">
            {isLoading ? (
               <div className="px-sm py-xs text-[15px] text-on-surface-variant animate-pulse pl-9">Loading...</div>
            ) : conversations.length === 0 ? (
               <div className="px-sm py-xs text-[15px] text-on-surface-variant pl-9">No recent chats</div>
            ) : (
              conversations.map(conv => (
                <div key={conv.id} className="relative group w-full flex items-center">
                  <button
                    onClick={() => router.push(`/?id=${conv.id}`)}
                    className={`flex-1 flex items-center gap-sm px-sm py-xs rounded-DEFAULT text-[15px] transition-colors duration-150 border border-transparent text-left pl-9 pr-6 min-w-0
                      ${activeConversationId === conv.id 
                        ? "text-primary font-medium bg-[#171717] border-outline-variant" 
                        : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"}`}
                  >
                    <span className="material-symbols-outlined text-[18px] flex-shrink-0">
                      chat_bubble_outline
                    </span>
                    <span className="truncate">{conv.title}</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === conv.id ? null : conv.id);
                    }}
                    className="absolute right-1 p-1 text-on-surface-variant hover:text-on-surface rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">more_vert</span>
                  </button>

                  {/* Context Menu */}
                  {activeMenuId === conv.id && (
                    <div 
                      className="absolute right-6 top-8 w-32 bg-[#262626] border border-outline-variant rounded-md shadow-lg z-[60] py-1"
                      onClick={e => e.stopPropagation()}
                    >
                      <button 
                        onClick={() => handleRename(conv.id, conv.title)}
                        className="w-full text-left px-3 py-1.5 text-sm text-on-surface hover:bg-[#333333]"
                      >
                        Rename
                      </button>
                      <button 
                        onClick={() => handleDelete(conv.id)}
                        className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-[#333333]"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        <div className="mt-auto flex flex-col gap-xs pt-4">
          <a
            className="flex items-center gap-sm px-sm py-xs rounded-DEFAULT text-on-surface-variant hover:bg-surface-container-high transition-colors duration-150 border border-transparent"
            href="#"
          >
            <span className="material-symbols-outlined text-[16px] flex-shrink-0">menu_book</span>
            <span className="truncate text-[15px]">Documentation</span>
          </a>
          <Link
            className="flex items-center gap-sm px-sm py-xs rounded-DEFAULT text-on-surface-variant hover:bg-surface-container-high transition-colors duration-150 border border-transparent"
            href="/settings"
          >
            <span className="material-symbols-outlined text-[16px] flex-shrink-0">settings</span>
            <span className="truncate text-[15px]">Settings</span>
          </Link>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-md border-t border-outline-variant mt-auto">
        <div className="flex items-center gap-sm cursor-pointer hover:opacity-80 transition-opacity">
          <img
            alt="Developer Profile"
            className="w-8 h-8 rounded-DEFAULT border border-outline-variant flex-shrink-0"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQdK7ixwGzmfvgWHeVNdZvwYgc25EBGNXZ0qarKEpw64Svd_CyXcYTtQRwdkrixtQ057kAAPeZWlSb6hYoY5M0RAasnqh4J6AJT0iQZKURCnHVLEIPsPIIBfGwPLd2au-rjkJnF_HNCO5OOF3HNZE2LRMgC-G6XV3S9Nafh3oVX_HsbotgvR3eyglAXSwGoCbYzDS9X7bAy59OQlE0Ipx_Ij5R4RLekaS6bG_FJo5I7zBPb2bsDowH7pJZe_1VeqSzykkmB8HvlZGG"
          />
          <div className="flex-1 min-w-0">
            <p className="font-body-md text-body-md font-medium truncate">DevUser_01</p>
            <p className="font-label-caps text-label-caps text-on-surface-variant truncate uppercase">
              Free Plan
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function SideNavBar() {
  return (
    <Suspense fallback={<div className="w-[250px] h-full border-r border-outline-variant bg-surface-container-low fixed left-0 top-0 flex-shrink-0"></div>}>
      <SideNavBarContent />
    </Suspense>
  );
}
