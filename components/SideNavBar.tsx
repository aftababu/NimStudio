"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useChatStore } from "../lib/store";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useShallow } from "zustand/react/shallow";

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  projectId: string;
}

interface Project {
  id: string;
  name: string;
}

function SideNavBarContent() {
  const {
    activeConversationId,
    setActiveConversationId,
    sidebarWidth,
    setSidebarWidth,
    setActiveModelId,
    activeProjectId,
    setActiveProjectId,
  } = useChatStore(
    useShallow((state) => ({
      activeConversationId: state.activeConversationId,
      setActiveConversationId: state.setActiveConversationId,
      sidebarWidth: state.sidebarWidth,
      setSidebarWidth: state.setSidebarWidth,
      setActiveModelId: state.setActiveModelId,
      activeProjectId: state.activeProjectId,
      setActiveProjectId: state.setActiveProjectId,
    })),
  );

  const [isRecentExpanded, setIsRecentExpanded] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<
    Record<string, boolean>
  >({ default: true });
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDragging = useRef(false);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      `${sidebarWidth}px`,
    );
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
      document.body.style.cursor = "default";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [setSidebarWidth]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.innerWidth < 1024) return;
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
  };

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      setActiveConversationId(id);
      fetch(`http://localhost:3001/api/chat/conversations/${id}/details`)
        .then((res) => res.json())
        .then((data) => {
          if (data.projectId) {
            setActiveProjectId(data.projectId);
            setExpandedProjects((prev) => ({
              ...prev,
              [data.projectId]: true,
            }));
          }
          if (data.modelId) setActiveModelId(data.modelId);
        })
        .catch(console.error);
    } else {
      setActiveConversationId(null);
    }
  }, [
    searchParams,
    setActiveConversationId,
    setActiveModelId,
    setActiveProjectId,
  ]);

  const { data: convData, isLoading: convLoading } = useQuery<{
    conversations: Conversation[];
  }>({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await fetch("http://localhost:3001/api/chat/conversations");
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    },
  });

  const { data: projData, isLoading: projLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("http://localhost:3001/api/projects");
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const res = await fetch(
        `http://localhost:3001/api/chat/conversations/${encodeURIComponent(id)}/rename`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        },
      );
      if (!res.ok) throw new Error("Failed to rename conversation");
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        `http://localhost:3001/api/chat/conversations/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed to delete conversation");
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });

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
        router.push("/");
      }
    }
    setActiveMenuId(null);
  };

  const handleNewChat = (projectId: string) => {
    setActiveConversationId(null);
    setActiveProjectId(projectId);
    router.push("/");
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  const handleSidebarClick = () => {
    if (activeMenuId) setActiveMenuId(null);
  };

  const conversations = convData?.conversations || [];
  const projects = projData || [];

  // Reorder projects so Default is first
  const sortedProjects = [...projects].sort((a, b) => {
    if (a.id === "default") return -1;
    if (b.id === "default") return 1;
    return a.name.localeCompare(b.name);
  });

  // Global Recent Conversations (last 5 active)
  const recentConversations = [...conversations]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 5);

  const renderConversationItem = (conv: Conversation) => {
    const isActive = activeConversationId === conv.id;
    return (
      <div key={conv.id} className="relative group w-full flex items-center">
        <button
          onClick={() => router.push(`/?id=${conv.id}`)}
          className={`flex-1 flex items-center gap-sm px-sm py-[6px] rounded-DEFAULT text-[14px] transition-colors duration-150 border border-transparent text-left pl-7 pr-6 min-w-0
            ${
              isActive
                ? "text-primary font-medium bg-surface border-outline-variant"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            }`}
        >
          <span className="material-symbols-outlined text-[16px] flex-shrink-0">
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
          <span className="material-symbols-outlined text-[16px]">
            more_vert
          </span>
        </button>

        {activeMenuId === conv.id && (
          <div
            className="absolute right-6 top-8 w-32 bg-surface-container-high border border-outline-variant rounded-md shadow-lg z-[60] py-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => handleRename(conv.id, conv.title)}
              className="w-full text-left px-3 py-1.5 text-sm text-on-surface hover:bg-surface-container-highest"
            >
              Rename
            </button>
            <button
              onClick={() => handleDelete(conv.id)}
              className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-surface-container-highest"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      onClick={handleSidebarClick}
      className="h-full border-r border-outline-variant bg-background flex flex-col fixed left-0 top-0 overflow-y-auto z-50 flex-shrink-0 transition-[width] duration-0"
      style={{ width: "var(--sidebar-width, 250px)" }}
    >
      <div
        onMouseDown={handleMouseDown}
        className="absolute right-0 top-0 w-1.5 h-full cursor-col-resize hover:bg-primary/50 z-[100] transition-colors"
      />
      {/* Header / Logo area */}
      <div
        onClick={() => {
          setActiveConversationId(null);
          router.push("/");
        }}
        className="py-2 px-4 border-b border-outline-variant flex justify-between items-center gap-sm cursor-pointer"
      >
        <div className="w-18 h-14 rounded-DEFAULT flex items-center justify-center text-on-primary">
          <Image
            src="/NimStudioLogo.png"
            alt="NimStudio Logo"
            width={1980}
            height={1080}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-label-caps flex items-center justify-start text-sm text-label-caps text-on-surface-variant uppercase truncate">
            <span className="material-symbols-outlined !text-md">add</span>
            AI Workspace{" "}
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-sm py-sm flex flex-col gap-2 custom-scrollbar">
        {/* Recent Conversations */}
        <div>
          <button
            onClick={() => setIsRecentExpanded(!isRecentExpanded)}
            className="flex items-center gap-sm px-xs py-xs rounded-DEFAULT text-on-surface hover:bg-surface-container-low transition-colors duration-150 group w-full text-left"
          >
            <span className="material-symbols-outlined text-[18px]">
              history
            </span>
            <span className="truncate font-body-md font-semibold text-[14px] flex-1">
              Recent Conversations
            </span>
            <span className="material-symbols-outlined text-[18px]">
              {isRecentExpanded ? "expand_less" : "expand_more"}
            </span>
          </button>
          {isRecentExpanded && (
            <div className="flex flex-col gap-[2px] mt-1 pl-2 border-l border-outline-variant/30 ml-3">
              {convLoading ? (
                <div className="px-sm py-xs text-[13px] text-on-surface-variant animate-pulse pl-7">
                  Loading...
                </div>
              ) : recentConversations.length === 0 ? (
                <div className="px-sm py-xs text-[13px] text-on-surface-variant pl-7">
                  No recent chats
                </div>
              ) : (
                recentConversations.map(renderConversationItem)
              )}
            </div>
          )}
        </div>

        <div className="w-full h-px bg-outline-variant/50 my-1"></div>

        {/* Projects List */}
        {projLoading ? (
          <div className="px-sm py-xs text-[14px] text-on-surface-variant animate-pulse">
            Loading projects...
          </div>
        ) : (
          sortedProjects.map((project) => {
            if (project.id === "default") return null;
            const isExpanded = !!expandedProjects[project.id];
            const projectChats = conversations
              .filter((c) => c.projectId === project.id)
              .sort(
                (a, b) =>
                  new Date(b.updatedAt).getTime() -
                  new Date(a.updatedAt).getTime(),
              );
            const isProjectActive = activeProjectId === project.id;

            return (
              <div key={project.id} className="flex flex-col gap-[2px]">
                <div className="flex items-center group w-full">
                  <button
                    onClick={() => toggleProject(project.id)}
                    className={`flex-1 flex items-center gap-sm px-xs py-xs rounded-DEFAULT transition-colors duration-150 text-left min-w-0
                      ${isProjectActive ? "text-primary" : "text-on-surface hover:bg-surface-container-low"}
                    `}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {isExpanded ? "folder_open" : "folder"}
                    </span>
                    <span
                      className={`truncate font-body-md text-[14px] flex-1 ${isProjectActive ? "font-bold" : "font-semibold"}`}
                    >
                      {project.name}
                    </span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNewChat(project.id);
                    }}
                    title="New Chat in Project"
                    className="p-1 mr-1 text-on-surface-variant hover:text-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      add
                    </span>
                  </button>
                </div>
                {isExpanded && (
                  <div className="flex flex-col gap-[2px] mt-1 pl-2 border-l border-outline-variant/30 ml-3">
                    {projectChats.length === 0 ? (
                      <div className="px-sm py-xs text-[13px] text-on-surface-variant pl-7">
                        No chats yet
                      </div>
                    ) : (
                      projectChats.map(renderConversationItem)
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </nav>

      <div className="mt-auto flex flex-col gap-xs py-4 px-sm border-t border-outline-variant">
        <a
          href="https://github.com/aftababu/NimStudio"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-sm px-sm py-xs rounded-DEFAULT text-on-surface-variant hover:bg-surface-container-high transition-colors duration-150 border border-transparent"
        >
          <span className="material-symbols-outlined text-[16px] flex-shrink-0">
            menu_book
          </span>
          <span className="truncate text-[14px] font-medium">
            Documentation
          </span>
        </a>
        <Link
          className="flex items-center gap-sm px-sm py-xs rounded-DEFAULT text-on-surface-variant hover:bg-surface-container-high transition-colors duration-150 border border-transparent"
          href="/settings"
        >
          <span className="material-symbols-outlined text-[16px] flex-shrink-0">
            settings
          </span>
          <span className="truncate text-[14px] font-medium">Settings</span>
        </Link>
      </div>
    </aside>
  );
}

export function SideNavBar() {
  return (
    <Suspense
      fallback={
        <div className="w-[250px] h-full border-r border-outline-variant bg-surface-container-low fixed left-0 top-0 flex-shrink-0"></div>
      }
    >
      <SideNavBarContent />
    </Suspense>
  );
}
