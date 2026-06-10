"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Project {
  id: string;
  name: string;
  createdAt: string;
}

export default function ProjectsSettingsPage() {
  const queryClient = useQueryClient();
  const [newProjectName, setNewProjectName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("http://localhost:3001/api/projects");
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const res = await fetch("http://localhost:3001/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create project");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setNewProjectName("");
      setError(null);
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      setError("Project Name is required.");
      return;
    }
    createMutation.mutate({ name: newProjectName.trim() });
  };

  if (isLoading) {
    return (
      <div className="animate-pulse text-on-surface-variant">
        Loading projects...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-xl">
      <div>
        <h1 className="text-2xl font-semibold text-on-surface mb-xs">
          Projects
        </h1>
        <p className="text-sm text-on-surface-variant">
          Manage your workspace projects.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-md max-w-2xl bg-surface p-lg border border-outline-variant rounded-xl shadow-lg"
      >
        <h2 className="text-lg font-medium text-on-surface">
          Create New Project
        </h2>

        {error && (
          <div className="bg-error/10 text-error px-sm py-xs rounded-md text-sm border border-error/20">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-sm">
          <label className="text-sm font-medium text-on-surface">
            Project Name
          </label>
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant rounded-md px-md py-sm text-sm text-on-surface focus:border-primary-container focus:outline-none transition-colors"
            placeholder="e.g. My Next.js App"
          />
        </div>

        <div className="pt-sm flex justify-end">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-primary text-on-primary px-lg py-sm rounded-md font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-sm"
          >
            {createMutation.isPending && (
              <span className="w-4 h-4 rounded-full border-2 border-on-primary border-t-transparent animate-spin"></span>
            )}
            Create Project
          </button>
        </div>
      </form>

      <div className="flex flex-col gap-md max-w-2xl">
        <h2 className="text-lg font-medium text-on-surface">
          Existing Projects
        </h2>
        {projects?.length === 0 ? (
          <p className="text-sm text-on-surface-variant">No projects found.</p>
        ) : (
          <div className="grid gap-sm">
            {projects?.map((project) => (
              <div
                key={project.id}
                className="bg-surface border border-outline-variant rounded-lg p-md flex items-center justify-between"
              >
                <div>
                  <h3 className="text-on-surface font-medium">
                    {project.name}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Created {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {project.id !== 'default' && (
                  <button
                    onClick={async () => {
                      if (window.confirm(`Delete project "${project.name}"? This will delete all its conversations and settings.`)) {
                        try {
                          const res = await fetch(`http://localhost:3001/api/projects/${project.id}`, { method: 'DELETE' });
                          if (!res.ok) throw new Error('Failed to delete');
                          queryClient.invalidateQueries({ queryKey: ["projects"] });
                        } catch (e) {
                          alert('Failed to delete project');
                        }
                      }
                    }}
                    className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
