import { Eye } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 relative">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #6366f1 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />
      <div className="relative w-full max-w-md px-4">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary shadow-lg shadow-indigo-200/50 mb-3">
            <Eye className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">WebSpy</h1>
          <p className="text-sm text-slate-500">Competitor Monitoring</p>
        </div>
        {children}
      </div>
    </div>
  );
}
