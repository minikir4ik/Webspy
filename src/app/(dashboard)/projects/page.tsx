import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage your competitor monitoring projects.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No projects yet</CardTitle>
          <CardDescription>
            Create your first project to start tracking competitor products and
            prices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Create your first project
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
