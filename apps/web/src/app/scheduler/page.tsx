import { ProductSalesPage } from "@/components/product-sales-page";
import { suiteApps } from "@/lib/suite-apps";

export default function SchedulerSalesPage() {
  return <ProductSalesPage app={suiteApps.find((app) => app.key === "scheduler")!} />;
}
