import { createClient } from "@/lib/supabase/server";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { ProjectCard } from "@/components/projects/project-card";
import { FolderKanban } from "lucide-react";
import type { Project } from "@/lib/types/database";

export default async function ProjectsPage() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  // Get product counts per project
  const projectIds = (projects as Project[] | null)?.map((p) => p.id) ?? [];
  let productCounts: Record<string, number> = {};

  if (projectIds.length > 0) {
    const { data: products } = await supabase
      .from("tracked_products")
      .select("project_id")
      .in("project_id", projectIds);

    if (products) {
      productCounts = products.reduce(
        (acc: Record<string, number>, p: { project_id: string }) => {
          acc[p.project_id] = (acc[p.project_id] || 0) + 1;
          return acc;
        },
        {}
      );
    }
  }

  const projectList = (projects as Project[] | null) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Projects
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your competitor monitoring projects.
          </p>
        </div>
        <CreateProjectDialog />
      </div>

      {projectList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-16 px-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 mb-4">
            <FolderKanban className="h-8 w-8 text-indigo-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">
            No projects yet
          </h3>
          <p className="text-sm text-slate-500 mb-6 text-center max-w-sm">
            Create your first project to start tracking competitor products and prices.
          </p>
          <CreateProjectDialog />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projectList.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              productCount={productCounts[project.id] || 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
