import { createClient } from "@/lib/supabase/server";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { ProjectCard } from "@/components/projects/project-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage your competitor monitoring projects.
          </p>
        </div>
        <CreateProjectDialog />
      </div>

      {projectList.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 rounded-full bg-muted p-4">
              <FolderKanban className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>No projects yet</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              Create your first project to start tracking competitor products
              and prices.
            </p>
            <CreateProjectDialog />
          </CardContent>
        </Card>
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
