import { redirect } from "next/navigation";
import { getCurrentUserFromCookies } from "@/app/lib/dal";
import LoginClient from "./LoginClient";

export default async function LoginPage() {
  const currUser = await getCurrentUserFromCookies();

  if (currUser) redirect("/home");

  return <LoginClient />;
}
