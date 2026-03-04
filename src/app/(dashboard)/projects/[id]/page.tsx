import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AddProductDialog } from "@/components/products/add-product-dialog";
import { ProductCard } from "@/components/products/product-card";
import { AutoScrapeProject } from "@/components/products/auto-scrape-project";
import { ChevronRight, Package } from "lucide-react";
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
    <div className="space-y-8">
      <AutoScrapeProject projectId={id} productCount={productList.length} />

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm">
        <Link href="/projects" className="text-slate-500 hover:text-slate-900 transition-colors">
          Projects
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <span className="font-medium text-slate-900">{typedProject.name}</span>
      </nav>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {typedProject.name}
          </h1>
          {typedProject.description && (
            <p className="mt-1 text-sm text-slate-500">
              {typedProject.description}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            {productList.length} product{productList.length !== 1 ? "s" : ""}{" "}
            tracked
          </p>
        </div>
        <AddProductDialog projectId={id} />
      </div>

      {productList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-16 px-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 mb-4">
            <Package className="h-8 w-8 text-indigo-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">
            No products tracked yet
          </h3>
          <p className="text-sm text-slate-500 mb-6 text-center max-w-sm">
            Add a competitor product URL to start monitoring prices and stock status.
          </p>
          <AddProductDialog projectId={id} />
        </div>
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
