import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AddProductDialog } from "@/components/products/add-product-dialog";
import { ProductCard } from "@/components/products/product-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package } from "lucide-react";
import type { Project, TrackedProduct } from "@/lib/types/database";

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!project) {
    notFound();
  }

  const typedProject = project as Project;

  const { data: products } = await supabase
    .from("tracked_products")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  const productList = (products as TrackedProduct[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/projects">
          <Button variant="ghost" size="sm" className="mb-2 -ml-2">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Projects
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {typedProject.name}
            </h1>
            {typedProject.description && (
              <p className="mt-1 text-muted-foreground">
                {typedProject.description}
              </p>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              {productList.length} product{productList.length !== 1 ? "s" : ""}{" "}
              tracked
            </p>
          </div>
          <AddProductDialog projectId={id} />
        </div>
      </div>

      {productList.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 rounded-full bg-muted p-4">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>No products tracked yet</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              Add a competitor product URL to start monitoring prices and stock
              status.
            </p>
            <AddProductDialog projectId={id} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {productList.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              projectId={id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
