import { redirect } from "next/navigation";
import { getCurrentUserFromCookies } from "@/app/lib/dal";
import TransactionsClient from "./TransactionsClient";

export default async function TransactionsPage() {
  const currUser = await getCurrentUserFromCookies();
  if (!currUser) redirect("/login");

  // Render the interactive client component and pass any needed props
  return <TransactionsClient />;
}
