import { redirect } from "next/navigation";
import { getCurrentUserFromCookies } from "@/app/lib/dal";
import AnalysisClient from "./AnalysisClient";

export default async function AnalysisPage() {
  const currUser = await getCurrentUserFromCookies();
  if (!currUser) redirect("/login");

  return <AnalysisClient />;
}
