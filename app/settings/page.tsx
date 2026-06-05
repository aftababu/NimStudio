"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function GeneralSettingsPage() {
  const queryClient = useQueryClient();

  // Fetch settings from API
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['settings', 'general'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/api/settings/general');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (newPrefs: any) => {
      const res = await fetch('http://localhost:3001/api/settings/general', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPrefs)
      });
      if (!res.ok) throw new Error('Failed to save settings');
      return res.json();
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
