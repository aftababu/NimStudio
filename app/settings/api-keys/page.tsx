"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface ApiKey {
  id: string;
  label: string;
  hint: string;
  projectId: string | null;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
}

export default function ApiKeysPage() {
  const queryClient = useQueryClient();

  const [newLabel, setNewLabel] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newProjectId, setNewProjectId] = useState<string>("default");

  const { data: keys, isLoading } = useQuery<ApiKey[]>({
    queryKey: ["settings", "api-keys"],
    queryFn: async () => {
      const res = await fetch("http://localhost:3001/api/api-keys");
      if (!res.ok) throw new Error("Failed to fetch API keys");
      return res.json();
    },
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("http://localhost:3001/api/projects");
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
  });

  const addKeyMutation = useMutation({
    mutationFn: async (payload: {
      label: string;
      key: string;
      projectId?: string;
    }) => {
      const res = await fetch("http://localhost:3001/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to add API key");
      return res.json();
    },
    onSuccess: () => {
      setNewLabel("");
      setNewKey("");
      setNewProjectId("default");
      queryClient.invalidateQueries({ queryKey: ["settings", "api-keys"] });
    },
  });

  const revokeKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        `http://localhost:3001/api/api-keys/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) throw new Error("Failed to delete API key");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "api-keys"] });
    },
  });

  const handleAddKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || !newKey.trim()) return;
    addKeyMutation.mutate({
      label: newLabel,
      key: newKey,
      projectId: newProjectId,
    });
  };

  const getProjectName = (id: string | null) => {
    if (!id) return "Global / No Project";
    const proj = projects?.find((p) => p.id === id);
    return proj ? proj.name : id;
  };

  return (
    <div className="flex flex-col gap-xl">
      <div>
        <h1 className="text-2xl font-semibold text-on-surface mb-xs">
          API Keys
        </h1>
        <p className="text-sm text-on-surface-variant">
          Manage your NVIDIA NIM API keys for model access.
        </p>
      </div>

      {/* Add New Key Form */}
      <form
        onSubmit={handleAddKey}
        className="flex flex-col gap-md bg-surface border border-outline-variant rounded-md p-lg max-w-4xl"
      >
        <h2 className="text-sm font-medium text-on-surface mb-xs">
          Add New Key
        </h2>
        <div className="flex gap-md items-start">
          <div className="flex flex-col gap-xs flex-1">
            <label className="text-xs text-on-surface-variant font-medium">
              Label
            </label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Production Key"
              className="w-full bg-surface-container-low border border-outline-variant rounded-md px-md py-sm text-sm text-on-surface focus:border-primary-container focus:outline-none transition-colors"
            />
          </div>
          <div className="flex flex-col gap-xs flex-[2]">
            <label className="text-xs text-on-surface-variant font-medium">
              API Key
            </label>
            <input
              type="password"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="nvapi-..."
              className="w-full bg-surface-container-low border border-outline-variant rounded-md px-md py-sm text-sm text-on-surface focus:border-primary-container focus:outline-none transition-colors font-code-sm"
            />
          </div>
          <div className="flex flex-col gap-xs flex-1">
            <label className="text-xs text-on-surface-variant font-medium">
              Project
            </label>
            <select
              value={newProjectId}
              onChange={(e) => setNewProjectId(e.target.value)}
              className="w-full bg-transparent border border-outline-variant rounded-md px-md py-sm text-sm text-on-surface focus:border-primary-container focus:outline-none transition-colors appearance-none"
              style={{
                backgroundImage:
                  'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 0.7rem top 50%",
                backgroundSize: "0.65rem auto",
              }}
            >
              {projects?.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                  className="bg-surface text-on-surface"
                >
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-xs pt-[22px]">
            <button
              type="submit"
              disabled={
                addKeyMutation.isPending || !newLabel.trim() || !newKey.trim()
              }
              className="bg-primary text-on-primary px-lg py-sm rounded-md font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed h-[38px] flex items-center justify-center min-w-[80px]"
            >
              {addKeyMutation.isPending ? (
                <span className="w-4 h-4 rounded-full border-2 border-on-primary border-t-transparent animate-spin"></span>
              ) : (
                "Save"
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Active Keys List */}
      <div className="flex flex-col gap-sm max-w-4xl">
        <h2 className="text-sm font-medium text-on-surface">Active Keys</h2>
        <div className="border border-outline-variant rounded-md overflow-hidden bg-background">
          {isLoading ? (
            <div className="p-md text-sm text-on-surface-variant animate-pulse">
              Loading keys...
            </div>
          ) : keys?.length === 0 ? (
            <div className="p-md text-sm text-on-surface-variant text-center">
              No active API keys found.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant bg-surface">
                  <th className="px-md py-sm text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                    Label
                  </th>
                  <th className="px-md py-sm text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-md py-sm text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                    Key Hint
                  </th>
                  <th className="px-md py-sm text-xs font-medium text-on-surface-variant uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {keys?.map((key) => (
                  <tr key={key.id} className="bg-surface transition-colors">
                    <td className="px-md py-sm text-sm text-on-surface font-medium">
                      {key.label}
                    </td>
                    <td className="px-md py-sm text-sm text-on-surface-variant">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] ${key.projectId ? "bg-primary/10 text-primary border border-primary/20" : "bg-outline-variant/30 text-on-surface-variant"}`}
                      >
                        {getProjectName(key.projectId)}
                      </span>
                    </td>
                    <td className="px-md py-sm text-sm text-on-surface-variant font-code-sm">
                      {key.hint}
                    </td>
                    <td className="px-md py-sm text-right">
                      <button
                        onClick={() => {
                          if (window.confirm(`Revoke key "${key.label}"?`)) {
                            revokeKeyMutation.mutate(key.id);
                          }
                        }}
                        disabled={revokeKeyMutation.isPending}
                        className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
