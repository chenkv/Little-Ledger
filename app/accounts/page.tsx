import { redirect } from "next/navigation";
import { getCurrentUserFromCookies } from "@/app/lib/dal";
import AccountsClient from "./AccountsClient";

export default async function AccountsPage() {
  const currUser = await getCurrentUserFromCookies();
  if (!currUser) redirect("/login");

  // Render the interactive client component and pass any needed props
  return <AccountsClient />;
}
