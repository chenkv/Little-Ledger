import { redirect } from "next/navigation";
import { getCurrentUserFromCookies } from "@/app/lib/dal";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const currUser = await getCurrentUserFromCookies();
  if (!currUser) redirect("/login");

  // Render the interactive client component and pass any needed props
  return <DashboardClient />;
}
