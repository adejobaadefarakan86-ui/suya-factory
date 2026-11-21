// The old phone stock page: stock is now on Admin → Supermarkets.
import { redirect } from "next/navigation";

export default function StockPage() {
  redirect("/admin/stores");
}
