"use client";

import type { MouseEvent } from "react";

type SidebarProps = {
  active: string;
  setActive: (value: string) => void;
};

export default function Sidebar({ active, setActive }: SidebarProps) {
  function moveText(event: MouseEvent<HTMLDivElement>) {
    if (event.currentTarget.dataset.value === active) return;

    const text = event.currentTarget.querySelector<HTMLSpanElement>("span");

    if (!text) return;

    const container = event.currentTarget;
    const distance = container.clientWidth - text.offsetLeft - text.offsetWidth;
    text.style.transform = `translateX(${Math.max(0, distance)}px)`;
  }

  function resetText(container: HTMLDivElement, selectedValue = active) {
    if (container.dataset.value === selectedValue) return;
    const text = container.querySelector<HTMLSpanElement>("span");

    if (text) text.style.transform = "translateX(0px)";
  }

  function selectItem(event: MouseEvent<HTMLDivElement>, value: string) {
    const items =
      event.currentTarget.parentElement?.querySelectorAll<HTMLDivElement>(
        "[data-value]",
      );
    items?.forEach((item) => resetText(item, value));
    setActive(value);
  }

  return (
    <div className="w-[20vw] z-10 px-4 flex flex-col text-left bg-(--card-dark) rounded-tr-3xl">
      <div
        data-value="spending"
        className="relative py-6 border-b-2 border-(--border) dark:border-(--border-dark) last:border-none hover:cursor-pointer select-none"
        onMouseEnter={moveText}
        onMouseLeave={(event) => resetText(event.currentTarget)}
        onClick={(event) => selectItem(event, "spending")}
      >
        <span className="inline-block transition-transform duration-300 ease-in-out">
          Spending Analysis
        </span>
      </div>
      <div
        data-value="budgets"
        className="relative py-6 border-b-2 border-(--border) dark:border-(--border-dark) last:border-none hover:cursor-pointer select-none"
        onMouseEnter={moveText}
        onMouseLeave={(event) => resetText(event.currentTarget)}
        onClick={(event) => selectItem(event, "budgets")}
      >
        <span className="inline-block transition-transform duration-300 ease-in-out">
          Budgets
        </span>
      </div>
      <div
        data-value="goals"
        className="relative py-6 border-b-2 border-(--border) dark:border-(--border-dark) last:border-none hover:cursor-pointer select-none"
        onMouseEnter={moveText}
        onMouseLeave={(event) => resetText(event.currentTarget)}
        onClick={(event) => selectItem(event, "goals")}
      >
        <span className="inline-block transition-transform duration-300 ease-in-out">
          Goals and Projections
        </span>
      </div>
      <div
        data-value="health"
        className="relative py-6 border-b-2 border-(--border) dark:border-(--border-dark) last:border-none hover:cursor-pointer select-none"
        onMouseEnter={moveText}
        onMouseLeave={(event) => resetText(event.currentTarget)}
        onClick={(event) => selectItem(event, "health")}
      >
        <span className="inline-block transition-transform duration-300 ease-in-out">
          Financial Health
        </span>
      </div>
      <div
        data-value="forecast"
        className="relative py-6 border-b-2 border-(--border) dark:border-(--border-dark) last:border-none hover:cursor-pointer select-none"
        onMouseEnter={moveText}
        onMouseLeave={(event) => resetText(event.currentTarget)}
        onClick={(event) => selectItem(event, "forecast")}
      >
        <span className="inline-block transition-transform duration-300 ease-in-out">
          Financial Forecast
        </span>
      </div>
    </div>
  );
}
