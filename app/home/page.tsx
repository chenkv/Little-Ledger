import { redirect } from "next/navigation";
import { getCurrentUserFromCookies } from "@/app/lib/dal";
import DashboardClient from "./DashboardClient";

const dummyData = {
  "2024-04": {
    monthLabel: "April 2024",
    budget: 2000,
    spent: 1450,
    categories: [
      { name: "Groceries", spent: 420, budget: 500 },
      { name: "Eating Out", spent: 260, budget: 300 },
      { name: "Transportation", spent: 120, budget: 200 },
      { name: "Entertainment", spent: 180, budget: 250 },
    ],
    transactions: [
      { name: "Kroger", amount: 52.13, date: "Apr 21" },
      { name: "Uber", amount: 18.90, date: "Apr 20" },
      { name: "Starbucks", amount: 6.75, date: "Apr 20" },
    ],
  },
  "2024-03": {
    monthLabel: "March 2024",
    budget: 2000,
    spent: 1675,
    categories: [
      { name: "Groceries", spent: 510, budget: 500 },
      { name: "Eating Out", spent: 340, budget: 300 },
      { name: "Transportation", spent: 150, budget: 200 },
      { name: "Entertainment", spent: 240, budget: 250 },
    ],
    transactions: [
      { name: "Publix", amount: 64.22, date: "Mar 29" },
      { name: "Gas", amount: 42.10, date: "Mar 28" },
      { name: "Chipotle", amount: 12.50, date: "Mar 27" },
    ],
  },
};

export default async function DashboardPage() {
  const currUser = await getCurrentUserFromCookies();
  if (!currUser) redirect("/login");

  // Render the interactive client component and pass any needed props
  return <DashboardClient />;
}
