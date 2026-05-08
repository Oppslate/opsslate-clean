import { ProductSalesPage } from "@/components/product-sales-page";
import { suiteApps } from "@/lib/suite-apps";

export default function ProjectManagementSalesPage() {
  return <ProductSalesPage app={suiteApps.find((app) => app.key === "projectManagement")!} />;
}
