"use client";

import { useQuery } from '@tanstack/react-query';
import { useChatStore } from '../lib/store';
import { useState, useRef, useEffect } from 'react';

interface Project {
  id: string;
  name: string;
}

export function ProjectSelector() {
  const { activeProjectId, setActiveProjectId, activeConversationId } = useChatStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/api/projects');
      if (!res.ok) throw new Error('Failed to fetch projects');
      return res.json();
    }
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeProject = projects?.find(p => p.id === activeProjectId) || { name: 'Default Project' };

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        className="flex items-center gap-xs px-sm py-xs border border-outline-variant rounded-DEFAULT bg-surface hover:border-surface-container-highest transition-colors cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-label-caps text-label-caps text-on-surface-variant">
          PROJECT:
        </span>
        <span className="font-body-md text-body-md text-on-surface whitespace-nowrap">
          {isLoading ? 'Loading...' : activeProject.name}
        </span>
        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
          expand_more
        </span>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-xs w-64 bg-surface border border-outline-variant rounded-md shadow-lg overflow-hidden z-50">
          <div className="max-h-64 overflow-y-auto custom-scrollbar flex flex-col gap-[1px]">
            {projects?.map(project => (
              <div
                key={project.id}
                className={`px-md py-sm cursor-pointer hover:bg-surface-container-high transition-colors ${project.id === activeProjectId ? 'bg-surface-container-high text-primary' : 'text-on-surface'}`}
                onClick={async () => {
                  setActiveProjectId(project.id);
                  if (activeConversationId) {
                    try {
                      await fetch(`http://localhost:3001/api/chat/conversations/${activeConversationId}/preferences`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ projectId: project.id })
                      });
                    } catch (err) {
                      console.error("Failed to save project preference for chat:", err);
                    }
                  }
                  setIsOpen(false);
                }}
              >
                <div className="font-medium text-sm">{project.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
