"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function GeneralSettingsPage() {
  const queryClient = useQueryClient();

  // Mock TanStack Query hooks for backend integration
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['settings', 'general'],
    queryFn: async () => {
      // Mock fetch
      return new Promise((resolve) => setTimeout(() => resolve({
        defaultModel: 'meta/llama-3.3-70b-instruct',
        systemPrompt: 'You are a highly capable AI assistant.',
        theme: 'dark'
      }), 500));
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (newPrefs: any) => {
      // Mock save
      return new Promise((resolve) => setTimeout(resolve, 800));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'general'] });
    }
  });

  // Local form state
  const [formData, setFormData] = useState({
    defaultModel: '',
    systemPrompt: '',
    theme: 'dark'
  });

  useEffect(() => {
    if (preferences) {
      setFormData(preferences as any);
    }
  }, [preferences]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="animate-pulse text-on-surface-variant">Loading preferences...</div>;
  }

  return (
    <div className="flex flex-col gap-xl">
      <div>
        <h1 className="text-2xl font-semibold text-on-surface mb-xs">General Preferences</h1>
        <p className="text-sm text-on-surface-variant">Manage your studio&apos;s global behaviors and aesthetics.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-lg max-w-2xl">
        {/* Default Model */}
        <div className="flex flex-col gap-sm">
          <label className="text-sm font-medium text-on-surface">Default Model</label>
          <div className="relative">
            <select
              value={formData.defaultModel}
              onChange={(e) => setFormData({ ...formData, defaultModel: e.target.value })}
              className="w-full appearance-none bg-[#171717] border border-outline-variant rounded-md px-md py-sm text-sm text-on-surface focus:border-primary-container focus:outline-none transition-colors"
            >
              <option value="meta/llama-3.3-70b-instruct">meta/llama-3.3-70b-instruct</option>
              <option value="deepseek-ai/deepseek-v4-pro">deepseek-ai/deepseek-v4-pro</option>
              <option value="qwen/qwen3-coder-480b-a35b-instruct">qwen/qwen3-coder-480b-a35b-instruct</option>
              <option value="mistralai/mistral-large-3-675b-instruct-2512">mistralai/mistral-large-3-675b-instruct-2512</option>
            </select>
            <span className="material-symbols-outlined absolute right-md top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[20px]">
              expand_more
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">This model will be pre-selected when starting a new chat.</p>
        </div>

        {/* System Prompt */}
        <div className="flex flex-col gap-sm">
          <label className="text-sm font-medium text-on-surface">Global System Prompt</label>
          <textarea
            value={formData.systemPrompt}
            onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
            rows={5}
            className="w-full bg-[#171717] border border-outline-variant rounded-md px-md py-sm text-sm text-on-surface font-code-sm custom-scrollbar focus:border-primary-container focus:outline-none transition-colors resize-y min-h-[120px]"
            placeholder="Enter the system instructions..."
          />
          <p className="text-xs text-on-surface-variant mt-1">These instructions are prepended to every conversation implicitly.</p>
        </div>

        {/* Theme Selector */}
        <div className="flex flex-col gap-sm">
          <label className="text-sm font-medium text-on-surface">Theme</label>
          <div className="flex gap-md">
            <label className={`flex-1 cursor-pointer border rounded-md p-md flex items-center justify-center gap-sm transition-colors ${formData.theme === 'dark' ? 'bg-[#171717] border-primary text-primary' : 'bg-transparent border-outline-variant text-on-surface-variant hover:bg-[#171717]'}`}>
              <input 
                type="radio" 
                name="theme" 
                value="dark" 
                checked={formData.theme === 'dark'}
                onChange={() => setFormData({ ...formData, theme: 'dark' })}
                className="hidden" 
              />
              <span className="material-symbols-outlined text-[20px]">dark_mode</span>
              <span className="text-sm font-medium">Dark Mode</span>
            </label>
            <label className={`flex-1 cursor-pointer border rounded-md p-md flex items-center justify-center gap-sm transition-colors ${formData.theme === 'light' ? 'bg-[#171717] border-primary text-primary' : 'bg-transparent border-outline-variant text-on-surface-variant hover:bg-[#171717]'}`}>
              <input 
                type="radio" 
                name="theme" 
                value="light" 
                checked={formData.theme === 'light'}
                onChange={() => setFormData({ ...formData, theme: 'light' })}
                className="hidden" 
              />
              <span className="material-symbols-outlined text-[20px]">light_mode</span>
              <span className="text-sm font-medium">Light Mode</span>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-md flex items-center justify-end border-t border-outline-variant">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="bg-primary text-on-primary px-xl py-sm rounded-md font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-sm"
          >
            {saveMutation.isPending && <span className="w-4 h-4 rounded-full border-2 border-on-primary border-t-transparent animate-spin"></span>}
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
}
