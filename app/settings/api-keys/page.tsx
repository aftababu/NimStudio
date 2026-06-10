"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface ApiKey {
  id: string;
  projectId: string;
  isConfigured: boolean;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
}

export default function ApiKeysPage() {
  const queryClient = useQueryClient();

  const [projectId, setProjectId] = useState("default");
  const [newKey, setNewKey] = useState("");

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
      projectId: string;
      key: string;
    }) => {
      // Upsert API key
      const res = await fetch("http://localhost:3001/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: payload.key, projectId: payload.projectId }),
      });
      if (!res.ok) throw new Error("Failed to add API key");
      return res.json();
    },
    onSuccess: () => {
      setProjectId("default");
      setNewKey("");
      queryClient.invalidateQueries({ queryKey: ["settings", "api-keys"] });
    },
  });

  const handleAddKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !newKey.trim()) return;
    addKeyMutation.mutate({
      projectId: projectId,
      key: newKey.trim(),
    });
  };

  const getProjectName = (id: string | null) => {
    if (!id) return "Unknown";
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
          Manage your NVIDIA NIM API keys. Each project must have exactly one API key.
        </p>
      </div>

      {/* Add New Key Form */}
      <form
        onSubmit={handleAddKey}
        className="flex flex-col gap-md bg-surface border border-outline-variant rounded-md p-lg max-w-4xl"
      >
        <h2 className="text-sm font-medium text-on-surface mb-xs">
          Assign Key to Project
        </h2>
        <div className="flex gap-md items-start">
          <div className="flex flex-col gap-xs flex-1">
            <label className="text-xs text-on-surface-variant font-medium">
              Project Name
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-md px-md py-sm text-sm text-on-surface focus:border-primary-container focus:outline-none transition-colors appearance-none"
            >
              <option value="" disabled>Select a project</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
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
          <div className="flex flex-col gap-xs pt-[22px]">
            <button
              type="submit"
              disabled={
                addKeyMutation.isPending || !projectId || !newKey.trim()
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
        <h2 className="text-sm font-medium text-on-surface">Configured Projects</h2>
        <div className="border border-outline-variant rounded-md overflow-hidden bg-background">
          {isLoading ? (
            <div className="p-md text-sm text-on-surface-variant animate-pulse">
              Loading...
            </div>
          ) : keys?.length === 0 ? (
            <div className="p-md text-sm text-on-surface-variant text-center">
              No API keys configured.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant bg-surface">
                  <th className="px-md py-sm text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                     Project Name
                  </th>
                  <th className="px-md py-sm text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                     Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {keys?.map((key) => (
                  <tr key={key.id} className="bg-surface transition-colors">
                    <td className="px-md py-sm text-sm text-on-surface font-medium">
                      {getProjectName(key.projectId)}
                    </td>
                    <td className="px-md py-sm text-sm text-on-surface-variant">
                      {key.isConfigured ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-primary/10 text-primary border border-primary/20">
                          Key Configured
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-outline-variant/30 text-on-surface-variant">
                          Not Configured
                        </span>
                      )}
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
