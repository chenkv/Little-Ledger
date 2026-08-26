import Sidebar from "../components/Sidebar";
import { JSX } from "react";

type WrapperProps = {
  content: JSX.Element;
};

export default function DashboardLayout({ content }: WrapperProps) {
  return (
    <div className="flex min-h-screen min-w-screen bg-[var(--bg)] text-[var(--text)] dark:bg-[var(--bg-dark)] dark:text-[var(--text-dark)]">
      <Sidebar />

      <main className="w-max flex-1 p-6 overflow-y-auto">{content}</main>
    </div>
  );
}
