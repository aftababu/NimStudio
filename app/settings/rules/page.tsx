"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Rule {
  id: string;
  content: string;
  isActive: boolean;
  priority: number;
}

export default function RulesPage() {
  const queryClient = useQueryClient();
  const [localRules, setLocalRules] = useState<Rule[]>([]);
  const [newRuleContent, setNewRuleContent] = useState("");

  const { data: rules, isLoading } = useQuery<Rule[]>({
    queryKey: ['settings', 'rules'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/api/rules');
      if (!res.ok) throw new Error('Failed to fetch rules');
      return res.json();
    }
  });

  useEffect(() => {
    if (rules) setLocalRules(rules);
  }, [rules]);

  const addRuleMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch('http://localhost:3001/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      if (!res.ok) throw new Error('Failed to add rule');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'rules'] });
    }
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string, isActive: boolean }) => {
      const res = await fetch(`http://localhost:3001/api/rules/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      });
      if (!res.ok) throw new Error('Failed to toggle rule');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'rules'] });
    }
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`http://localhost:3001/api/rules/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete rule');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'rules'] });
    }
  });

  const batchUpdateMutation = useMutation({
    mutationFn: async (updatedRules: Rule[]) => {
      const res = await fetch('http://localhost:3001/api/rules/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRules)
      });
      if (!res.ok) throw new Error('Failed to batch update rules');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'rules'] });
    }
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
    // Optimistic UI update
    const newArr = localRules.map(r => r.id === id ? { ...r, isActive: !currentStatus } : r);
    setLocalRules(newArr);
    toggleRuleMutation.mutate({ id, isActive: !currentStatus });
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleContent.trim()) return;
    addRuleMutation.mutate(newRuleContent.trim());
    setNewRuleContent("");
  };

  return (
    <div className="flex flex-col gap-xl">
      <div>
        <h1 className="text-2xl font-semibold text-on-surface mb-xs">Global Rules</h1>
        <p className="text-sm text-on-surface-variant">Inject prioritized system instructions to govern AI responses across all chats.</p>
      </div>

      <div className="flex flex-col gap-md max-w-3xl">
        {/* Add Rule Box */}
        <form onSubmit={handleAddRule} className="flex gap-sm items-start bg-[#171717] border border-outline-variant p-md rounded-md">
          <textarea
            value={newRuleContent}
            onChange={e => setNewRuleContent(e.target.value)}
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

        {/* Rules List */}
        <div className="flex flex-col gap-sm">
          {isLoading ? (
            <div className="p-md text-sm text-on-surface-variant animate-pulse border border-outline-variant rounded-md">Loading rules...</div>
          ) : localRules.length === 0 ? (
            <div className="p-md text-sm text-on-surface-variant text-center border border-outline-variant rounded-md border-dashed">No custom rules defined.</div>
          ) : (
            localRules.map((rule, index) => (
              <div 
                key={rule.id} 
                className={`flex gap-sm p-sm rounded-md border ${rule.isActive ? 'bg-[#171717] border-outline-variant' : 'bg-transparent border-outline-variant/50 opacity-60'} transition-all`}
              >
                {/* Reorder Controls */}
                <div className="flex flex-col gap-1 items-center justify-center pr-sm border-r border-outline-variant">
                  <button 
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0 || batchUpdateMutation.isPending}
                    className="text-on-surface-variant hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed p-0.5 rounded transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">keyboard_arrow_up</span>
                  </button>
                  <button 
                    onClick={() => handleMoveDown(index)}
                    disabled={index === localRules.length - 1 || batchUpdateMutation.isPending}
                    className="text-on-surface-variant hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed p-0.5 rounded transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-center min-w-0 px-xs">
                  <p className="text-sm text-on-surface whitespace-pre-wrap font-code-sm">{rule.content}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-xs pl-sm border-l border-outline-variant">
                  <button
                    onClick={() => handleToggleActive(rule.id, rule.isActive)}
                    disabled={toggleRuleMutation.isPending}
                    className="p-sm rounded-md text-on-surface-variant hover:bg-[#262626] hover:text-on-surface transition-colors flex items-center justify-center disabled:opacity-50"
                    title={rule.isActive ? "Disable Rule" : "Enable Rule"}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {rule.isActive ? "visibility" : "visibility_off"}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    disabled={deleteRuleMutation.isPending}
                    className="p-sm rounded-md text-red-400 hover:bg-[#333333] transition-colors flex items-center justify-center disabled:opacity-50"
                    title="Delete Rule"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
