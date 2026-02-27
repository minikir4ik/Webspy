import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground">
            Configure notifications for price changes and stock updates.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Alert
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No alerts configured</CardTitle>
          <CardDescription>
            Set up alerts to get notified when competitor prices change or
            products go out of stock.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Create your first alert
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
