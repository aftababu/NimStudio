"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";

interface Rule {
  id: string;
  content: string;
  isActive: boolean;
  priority: number;
}

export default function GeneralSettingsPage() {
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();

  // --- Theme Settings Logic ---
  const { data: preferences, isLoading: isPreferencesLoading } = useQuery({
    queryKey: ["settings", "general"],
    queryFn: async () => {
      const res = await fetch("http://localhost:3001/api/settings/general");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (newPrefs: any) => {
      const res = await fetch("http://localhost:3001/api/settings/general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPrefs),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "general"] });
    },
  });

  const [formData, setFormData] = useState({
    defaultModel: "",
    theme: "system",
  });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (preferences && preferences.theme) {
      setFormData(preferences as any);
    }
  }, [preferences]);

  const handleThemeChange = (newTheme: string) => {
    const updatedData = { ...formData, theme: newTheme };
    setFormData(updatedData);
    setTheme(newTheme);
    saveMutation.mutate(updatedData);
  };

  // --- Rules Logic ---
  const [localRules, setLocalRules] = useState<Rule[]>([]);
  const [newRuleContent, setNewRuleContent] = useState("");

  const { data: rules, isLoading: isRulesLoading } = useQuery<Rule[]>({
    queryKey: ["settings", "rules"],
    queryFn: async () => {
      const res = await fetch("http://localhost:3001/api/rules");
      if (!res.ok) throw new Error("Failed to fetch rules");
      return res.json();
    },
  });

  useEffect(() => {
    if (rules) setLocalRules(rules);
  }, [rules]);

  const addRuleMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("http://localhost:3001/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to add rule");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "rules"] });
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(
        `http://localhost:3001/api/rules/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive }),
        },
      );
      if (!res.ok) throw new Error("Failed to toggle rule");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "rules"] });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        `http://localhost:3001/api/rules/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) throw new Error("Failed to delete rule");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "rules"] });
    },
  });

  const batchUpdateMutation = useMutation({
    mutationFn: async (updatedRules: Rule[]) => {
      const res = await fetch("http://localhost:3001/api/rules/batch", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedRules),
      });
      if (!res.ok) throw new Error("Failed to batch update rules");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "rules"] });
    },
  });

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newArr = [...localRules];
    const temp = newArr[index - 1];
    newArr[index - 1] = newArr[index];
    newArr[index] = temp;
    setLocalRules(newArr);
    batchUpdateMutation.mutate(newArr);
  };

  const handleMoveDown = (index: number) => {
    if (index === localRules.length - 1) return;
    const newArr = [...localRules];
    const temp = newArr[index + 1];
    newArr[index + 1] = newArr[index];
    newArr[index] = temp;
    setLocalRules(newArr);
    batchUpdateMutation.mutate(newArr);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Remove this rule?")) {
      deleteRuleMutation.mutate(id);
    }
  };

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    const newArr = localRules.map((r) =>
      r.id === id ? { ...r, isActive: !currentStatus } : r,
    );
    setLocalRules(newArr);
    toggleRuleMutation.mutate({ id, isActive: !currentStatus });
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleContent.trim()) return;
    addRuleMutation.mutate(newRuleContent.trim());
    setNewRuleContent("");
  };

  if (isPreferencesLoading || !mounted) {
    return (
      <div className="animate-pulse text-on-surface-variant">
        Loading preferences...
      </div>
    );
  }

  // Determine current active theme either from next-themes or local state
  const currentTheme = theme || formData.theme;

  return (
    <div className="flex flex-col gap-xl">
      <div>
        <h1 className="text-2xl font-semibold text-on-surface mb-xs">
          General Settings
        </h1>
        <p className="text-sm text-on-surface-variant">
          Manage your studio&apos;s appearance and global AI instructions.
        </p>
      </div>

      <div className="flex flex-col gap-2xl max-w-3xl">
        {/* Theme Settings Section */}
        <section className="flex flex-col gap-md border border-outline-variant p-md rounded-lg bg-surface">
          <h2 className="text-lg font-medium text-on-surface">Appearance</h2>
          <div className="flex flex-col gap-md">
            <div className="flex flex-col gap-sm">
              <label className="text-sm font-medium text-on-surface">
                Theme
              </label>
              <div className="flex gap-md">
                <label
                  className={`flex-1 cursor-pointer border rounded-md p-md flex items-center justify-center gap-sm transition-colors ${currentTheme === "system" ? "bg-surface border-primary text-primary" : "bg-transparent border-outline-variant text-on-surface-variant hover:bg-surface"}`}
                >
                  <input
                    type="radio"
                    name="theme"
                    value="system"
                    checked={currentTheme === "system"}
                    onChange={() => handleThemeChange("system")}
                    className="hidden"
                  />
                  <span className="material-symbols-outlined text-[20px]">
                    desktop_windows
                  </span>
                  <span className="text-sm font-medium">System Mode</span>
                </label>
                <label
                  className={`flex-1 cursor-pointer border rounded-md p-md flex items-center justify-center gap-sm transition-colors ${currentTheme === "dark" ? "bg-surface border-primary text-primary" : "bg-transparent border-outline-variant text-on-surface-variant hover:bg-surface"}`}
                >
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    checked={currentTheme === "dark"}
                    onChange={() => handleThemeChange("dark")}
                    className="hidden"
                  />
                  <span className="material-symbols-outlined text-[20px]">
                    dark_mode
                  </span>
                  <span className="text-sm font-medium">Dark Mode</span>
                </label>
                <label
                  className={`flex-1 cursor-pointer border rounded-md p-md flex items-center justify-center gap-sm transition-colors ${currentTheme === "light" ? "bg-surface border-primary text-primary" : "bg-transparent border-outline-variant text-on-surface-variant hover:bg-surface"}`}
                >
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    checked={currentTheme === "light"}
                    onChange={() => handleThemeChange("light")}
                    className="hidden"
                  />
                  <span className="material-symbols-outlined text-[20px]">
                    light_mode
                  </span>
                  <span className="text-sm font-medium">Light Mode</span>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Global Rules Section */}
        <section className="flex flex-col gap-md my-4">
          <div>
            <h2 className="text-lg font-medium text-on-surface">
              Global Rules
            </h2>
            <p className="text-sm text-on-surface-variant">
              Inject prioritized system instructions to govern AI responses
              across all chats.
            </p>
          </div>

          <form
            onSubmit={handleAddRule}
            className="flex gap-sm items-start bg-surface-container-low border border-outline-variant p-md rounded-md"
          >
            <textarea
              value={newRuleContent}
              onChange={(e) => setNewRuleContent(e.target.value)}
              placeholder="Add a new rule..."
              rows={2}
              className="flex-1 bg-transparent border-none text-sm text-on-surface focus:ring-0 focus:outline-none resize-none custom-scrollbar"
            />
            <button
              type="submit"
              disabled={addRuleMutation.isPending || !newRuleContent.trim()}
              className="bg-primary text-on-primary px-md py-sm rounded-md font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              Add Rule
            </button>
          </form>

          <div className="flex flex-col gap-sm">
            {isRulesLoading ? (
              <div className="p-md text-sm text-on-surface-variant animate-pulse border border-outline-variant rounded-md">
                Loading rules...
              </div>
            ) : localRules.length === 0 ? (
              <div className="p-md text-sm text-on-surface-variant text-center border border-outline-variant rounded-md border-dashed">
                No custom rules defined.
              </div>
            ) : (
              localRules.map((rule, index) => (
                <div
                  key={rule.id}
                  className={`flex gap-sm p-sm rounded-md border ${rule.isActive ? "bg-surface border-outline-variant" : "bg-transparent border-outline-variant/50 opacity-60"} transition-all`}
                >
                  <div className="flex flex-col gap-1 items-center justify-center pr-sm border-r border-outline-variant">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0 || batchUpdateMutation.isPending}
                      className="text-on-surface-variant hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed p-0.5 rounded transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        keyboard_arrow_up
                      </span>
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={
                        index === localRules.length - 1 ||
                        batchUpdateMutation.isPending
                      }
                      className="text-on-surface-variant hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed p-0.5 rounded transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        keyboard_arrow_down
                      </span>
                    </button>
                  </div>
                  <div className="flex-1 flex flex-col justify-center min-w-0 px-xs">
                    <p className="text-sm text-on-surface whitespace-pre-wrap font-code-sm">
                      {rule.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-xs pl-sm border-l border-outline-variant">
                    <button
                      onClick={() => handleToggleActive(rule.id, rule.isActive)}
                      disabled={toggleRuleMutation.isPending}
                      className="p-sm rounded-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors flex items-center justify-center disabled:opacity-50"
                      title={rule.isActive ? "Disable Rule" : "Enable Rule"}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {rule.isActive ? "visibility" : "visibility_off"}
                      </span>
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      disabled={deleteRuleMutation.isPending}
                      className="p-sm rounded-md text-red-400 hover:bg-surface-container-highest transition-colors flex items-center justify-center disabled:opacity-50"
                      title="Delete Rule"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        delete
                      </span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
