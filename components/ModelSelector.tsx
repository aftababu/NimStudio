"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useChatStore } from "../lib/store";
import { useEffect, useRef, useState } from "react";

interface Model {
  id: string;
  name: string;
  provider: string;
  isActive: boolean;
  isSelected: boolean;
}

export function ModelSelector() {
  const { activeModelId, setActiveModelId, activeConversationId } = useChatStore();
  const queryClient = useQueryClient();
  const initialized = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newModelId, setNewModelId] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // For the individual model 3-dots menus
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<{ models: Model[] }>({
    queryKey: ['models'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/api/models');
      if (!res.ok) throw new Error('Failed to fetch models');
      return res.json();
    }
  });

  const selectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`http://localhost:3001/api/models/${encodeURIComponent(id)}/select`, { method: 'PUT' });
      if (!res.ok) throw new Error('Failed to select model');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['models'] })
  });

  const addMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`http://localhost:3001/api/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (!res.ok) throw new Error('Failed to add model');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      setIsModalOpen(false);
      setNewModelId("");
    }
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`http://localhost:3001/api/models/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove model');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['models'] })
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string, name: string }) => {
      const res = await fetch(`http://localhost:3001/api/models/${encodeURIComponent(id)}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (!res.ok) throw new Error('Failed to rename model');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['models'] })
  });

  const models = data?.models || [];
  const selectedModelObj = models.find(m => m.id === activeModelId);

  // Initialize Zustand state strictly from DB isSelected
  useEffect(() => {
    if (models.length > 0 && !initialized.current) {
      const selectedModel = models.find(m => m.isSelected) || models[0];
      setActiveModelId(selectedModel.id);
      initialized.current = true;
    }
  }, [models, setActiveModelId]);

  // Click outside listener for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectChange = async (id: string) => {
    setActiveModelId(id);
    selectMutation.mutate(id);
    
    // If we're inside a specific conversation, save the preference permanently for this chat
    if (activeConversationId) {
      try {
        await fetch(`http://localhost:3001/api/chat/conversations/${activeConversationId}/preferences`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelId: id })
        });
      } catch (err) {
        console.error("Failed to save model preference for chat:", err);
      }
    }
    
    setIsOpen(false);
  };

  const handleAddSubmit = () => {
    if (newModelId && newModelId.trim()) {
      addMutation.mutate(newModelId.trim());
      handleSelectChange(newModelId.trim());
    }
  };

  const handleRemove = (id: string) => {
    if (window.confirm(`Are you sure you want to remove this model?`)) {
      removeMutation.mutate(id);
      if (activeModelId === id) {
        initialized.current = false; // Force re-sync if we deleted active
      }
    }
    setActiveMenuId(null);
  };

  const handleRename = (id: string, currentName: string) => {
    const newName = window.prompt("Enter new model name:", currentName);
    if (newName && newName.trim() !== currentName) {
      renameMutation.mutate({ id, name: newName.trim() });
    }
    setActiveMenuId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-xs px-sm py-xs border border-outline-variant rounded-DEFAULT bg-surface">
        <span className="font-label-caps text-label-caps text-on-surface-variant">MODEL:</span>
        <span className="font-body-md text-body-md text-on-surface-variant animate-pulse w-24 inline-block">Loading...</span>
      </div>
    );
  }

  if (isError || models.length === 0) {
    return (
      <div className="flex items-center gap-xs px-sm py-xs border border-outline-variant rounded-DEFAULT bg-surface text-red-400">
        Error loading models
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-xs px-sm py-xs border border-outline-variant rounded-DEFAULT bg-surface hover:border-primary-container transition-colors max-w-[350px] w-full text-left"
      >
        <span className="font-label-caps text-label-caps text-on-surface-variant pointer-events-none whitespace-nowrap">
          MODEL:
        </span>
        <span className="text-primary font-medium truncate flex-1 pr-2">
          {selectedModelObj?.name || "Select Model"}
        </span>
        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-[350px] bg-surface border border-outline-variant rounded-lg shadow-xl z-50 flex flex-col overflow-hidden max-h-[400px]">
          <div className="overflow-y-auto custom-scrollbar flex-1 py-1">
            {models.map((model) => (
              <div 
                key={model.id} 
                className={`group relative flex items-center justify-between px-3 py-2 hover:bg-surface-container-high cursor-pointer transition-colors ${activeModelId === model.id ? 'bg-surface-container-high/50' : ''}`}
                onClick={() => handleSelectChange(model.id)}
              >
                <div className="flex flex-col min-w-0 pr-8">
                  <span className={`text-[15px] truncate ${activeModelId === model.id ? 'text-primary font-medium' : 'text-on-surface'}`}>
                    {model.name}
                  </span>
                  <span className="text-[11px] text-on-surface-variant truncate opacity-70">
                    {model.id}
                  </span>
                </div>
                
                {/* Context Menu Trigger */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(activeMenuId === model.id ? null : model.id);
                  }}
                  className="absolute right-2 p-1 text-on-surface-variant hover:text-on-surface rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="material-symbols-outlined text-[18px]">more_vert</span>
                </button>

                {/* Mini Context Menu */}
                {activeMenuId === model.id && (
                  <div className="absolute right-8 top-8 w-32 bg-surface-container-high border border-outline-variant rounded-md shadow-lg z-[60] py-1"
                       onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => handleRename(model.id, model.name)}
                      className="w-full text-left px-3 py-1.5 text-sm text-on-surface hover:bg-surface-container-highest"
                    >
                      Rename
                    </button>
                    <button 
                      onClick={() => handleRemove(model.id)}
                      className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-surface-container-highest"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="p-2 border-t border-outline-variant bg-surface-container-low">
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-md transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add Model
            </button>
          </div>
        </div>
      )}

      {/* Add Model Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-surface border border-outline-variant rounded-xl shadow-2xl w-[400px] p-6 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-on-surface mb-4">Add Custom Model</h2>
            <p className="text-sm text-on-surface-variant mb-4">
              Enter the exact Model ID from NVIDIA NIM (e.g. <code>meta/llama-3.2-1b-instruct</code>).
            </p>
            <input
              type="text"
              value={newModelId}
              onChange={(e) => setNewModelId(e.target.value)}
              placeholder="Model ID..."
              className="w-full bg-surface-container-high border border-outline-variant rounded-md px-3 py-2 text-on-surface focus:outline-none focus:border-primary-container mb-6"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddSubmit}
                disabled={!newModelId.trim() || addMutation.isPending}
                className="px-4 py-2 text-sm font-medium bg-primary text-on-primary rounded-md hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {addMutation.isPending ? 'Adding...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
