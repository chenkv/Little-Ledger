"use client";

import Sidebar from "./Sidebar";
import SpendingAnalysis from "./SpendingAnalysis";
import Budgets from "./Budgets";
import Goals from "./Goals";
import Health from "./Health";
import Forecast from "./Forecast";
import { useEffect, useRef, useState } from "react";

export default function AnalysisClient() {
  const [activeTab, setActiveTab] = useState<string>("");
  const [displayedTab, setDisplayedTab] = useState<string>("");
  const [panelPhase, setPanelPhase] = useState<"entering" | "exiting" | "idle">(
    "idle",
  );
  const transitionTimeout = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (transitionTimeout.current !== null) {
        window.clearTimeout(transitionTimeout.current);
      }
    };
  }, []);

  function selectTab(value: string) {
    if (value === activeTab) return;

    if (transitionTimeout.current !== null) {
      window.clearTimeout(transitionTimeout.current);
      transitionTimeout.current = null;
    }

    setActiveTab(value);
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!displayedTab || value === displayedTab) {
      setDisplayedTab(value);
      setPanelPhase(prefersReducedMotion ? "idle" : "entering");
      return;
    }

    setPanelPhase("exiting");

    transitionTimeout.current = window.setTimeout(
      () => {
        setDisplayedTab(value);
        setPanelPhase(prefersReducedMotion ? "idle" : "entering");
        transitionTimeout.current = null;
      },
      prefersReducedMotion ? 0 : 300,
    );
  }

  return (
    <div className="flex flex-1 w-full flex-col text-center">
      <h1 className="py-4 text-4xl">What do you want to examine today?</h1>
      <div className="flex-1 flex">
        <Sidebar active={activeTab} setActive={selectTab} />
        <div
          className={`min-w-0 flex-1 flex overflow-hidden analysis-panel-${panelPhase}`}
          onAnimationEnd={(event) => {
            if (event.animationName === "analysis-slide-in") {
              setPanelPhase("idle");
            }
          }}
        >
          {displayedTab === "spending" ? <SpendingAnalysis /> : null}
          {displayedTab === "budgets" ? <Budgets /> : null}
          {displayedTab === "goals" ? <Goals /> : null}
          {displayedTab === "health" ? <Health /> : null}
          {displayedTab === "forecast" ? <Forecast /> : null}
        </div>
      </div>
    </div>
  );
}
