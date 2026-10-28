"use client";

import Sidebar from "./Sidebar";
import { useState } from "react";

export default function AnalysisClient() {
  const [activeTab, setActiveTab] = useState<string>("");

  return (
    <div className="flex flex-1 w-full flex-col text-center">
      <h1 className="py-4 text-4xl">What do you want to examine today?</h1>
      <Sidebar active={activeTab} setActive={setActiveTab} />
    </div>
  );
}
