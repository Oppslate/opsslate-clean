import { ProductSalesPage } from "@/components/product-sales-page";
import { suiteApps } from "@/lib/suite-apps";

export default function BooksSalesPage() {
  return <ProductSalesPage app={suiteApps.find((app) => app.key === "books")!} />;
}
