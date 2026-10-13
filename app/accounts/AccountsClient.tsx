"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";
import Image from "next/image";
import useSWR from "swr";
import { financial_account_get } from "@/types/api-res-types";
import AccountCard from "./AccountCard";

async function fetcher(
  url: string,
): Promise<{ accounts: financial_account_get[] }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch account data.");
  return response.json();
}

export default function AccountsClient() {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/user/financial-accounts`,
    fetcher,
  );
  const carouselRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startScrollLeft: number;
    isDragging: boolean;
  } | null>(null);
  const didDragRef = useRef(false);
  const [activeAccountId, setActiveAccountId] = useState<number | null>(null);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: event.currentTarget.scrollLeft,
      isDragging: false,
    };
    didDragRef.current = false;
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const distance = event.clientX - drag.startX;
    if (!drag.isDragging && Math.abs(distance) > 5) {
      drag.isDragging = true;
      didDragRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    if (drag.isDragging) {
      event.preventDefault();
      event.currentTarget.scrollLeft = drag.startScrollLeft - distance;
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  }

  function handlePointerLeave() {
    if (!dragRef.current?.isDragging) {
      dragRef.current = null;
    }
  }

  function handleCarouselClick(event: MouseEvent<HTMLDivElement>) {
    if (!didDragRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    didDragRef.current = false;
  }

  function handleAccountSelect(accountId: number) {
    setActiveAccountId(accountId);

    const carousel = carouselRef.current;
    const selectedCard = carousel?.querySelector<HTMLElement>(
      `[data-account-id="${accountId}"]`,
    );
    if (!carousel || !selectedCard) return;

    const carouselBounds = carousel.getBoundingClientRect();
    const cardBounds = selectedCard.getBoundingClientRect();
    const distanceFromCenter =
      cardBounds.left +
      cardBounds.width / 2 -
      (carouselBounds.left + carouselBounds.width / 2);

    carousel.scrollBy({ left: distanceFromCenter, behavior: "smooth" });
  }

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    let animationFrame = 0;
    const updateScale = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const center = carousel.scrollLeft + carousel.clientWidth / 2;
        const maxDistance = carousel.clientWidth / 2 || 1;

        const items = Array.from(
          carousel.querySelectorAll<HTMLElement>("[data-scroll-scale]"),
          (element) => {
            const itemCenter = element.offsetLeft + element.offsetWidth / 2;
            const width = element.offsetWidth;
            const distance = Math.min(
              Math.abs(itemCenter - center) / maxDistance,
              1,
            );
            const scale = 1 - distance * 0.2;

            return {
              element,
              centerOffset: itemCenter - center,
              scale,
              brightness: 1 - distance * 0.6,
              shrink: width * (1 - scale),
              translateX: 0,
            };
          },
        );

        const leftItems = items
          .filter((item) => item.centerOffset < 0)
          .reverse();
        let leftShrink = 0;
        leftItems.forEach((item) => {
          item.translateX = leftShrink + item.shrink / 2;
          leftShrink += item.shrink;
        });

        const rightItems = items.filter((item) => item.centerOffset > 0);
        let rightShrink = 0;
        rightItems.forEach((item) => {
          item.translateX = -(rightShrink + item.shrink / 2);
          rightShrink += item.shrink;
        });

        items.forEach(({ element, translateX, scale, brightness }) => {
          element.style.transform = `translateX(${translateX}px) scale(${scale})`;
          element.style.filter = `brightness(${brightness})`;
        });

        animationFrame = 0;
      });
    };

    updateScale();
    carousel.addEventListener("scroll", updateScale, { passive: true });
    window.addEventListener("resize", updateScale);

    return () => {
      cancelAnimationFrame(animationFrame);
      carousel.removeEventListener("scroll", updateScale);
      window.removeEventListener("resize", updateScale);
    };
  }, [data, error, isLoading]);

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();

    const form = e.currentTarget;
    const formData = new FormData(form);

    const data = [
      {
        name: formData.get("name"),
        type: formData.get("type"),
        institution: formData.get("institution"),
        description: formData.get("description"),
      },
    ];

    try {
      const response = await fetch("/api/user/financial-accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const res = await response.json();
        throw new Error(res.error);
      }

      const result = await response.json();

      console.log("Created account:", result);
      await mutate();

      // Optionally reset the form
      form.reset();
    } catch (error) {
      console.error(error);
    }
  }

  let result = null;
  if (isLoading) {
    result = (
      <section className="p-6 rounded-xl bg-(--surface) dark:bg-(--surface-dark) shadow space-y-4 flex-1">
        Loading...
      </section>
    );
  } else if (error) {
    result = (
      <section className="p-6 rounded-xl bg-(--surface) dark:bg-(--surface-dark) shadow space-y-4 flex-1">
        Error! Failed to load.
      </section>
    );
  } else {
    result = [];

    if (data) {
      result = data.accounts.map((account) => (
        <AccountCard
          key={account.id}
          account={account}
          isActive={activeAccountId === account.id}
          onSelect={() => handleAccountSelect(account.id)}
        />
      ));
    }

    result.push(
      <div
        key="add-account"
        data-scroll-scale
        className="w-[4rem] h-[4rem] flex flex-col rounded-full shadow-md bg-white dark:bg-(--account-card-dark) items-center justify-center cursor-pointer hover:shadow-lg transition-shadow duration-300 shrink-0"
        onClick={() => {
          const form = document.getElementById(
            "add-account-form",
          ) as HTMLFormElement;
          if (form) {
            form.scrollIntoView({ behavior: "smooth" });
          }
        }}
      >
        <Image
          src="/add-account.svg"
          alt="Add Account"
          width={24}
          height={24}
        />
      </div>,
    );
  }

  console.log(data);

  return (
    <div>
      <div
        ref={carouselRef}
        style={{
          paddingInline: "max(0px, calc((100% - 20rem) / 2))",
          scrollbarWidth: "none",
        }}
        className="relative py-8 flex items-center justify-start space-x-4 overflow-x-scroll scrollbar-hidden cursor-grab active:cursor-grabbing select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onClickCapture={handleCarouselClick}
      >
        {result}
      </div>

      <div className="flex space-x-4 bg-(--surface-dark)">
        <div className="w-[30%]">
          <form
            onSubmit={handleSubmit}
            className="p-6 rounded-xl bg-(--surface) dark:bg-(--surface-dark) shadow space-y-4"
          >
            <h2 className="text-xl font-semibold">
              Create New Financial Account
            </h2>

            <input
              type="text"
              name="name"
              required
              placeholder="Account Name"
              className="w-full px-3 py-2 rounded-md text-md bg-(--card) dark:bg-(--card-dark)"
            />

            <select
              name="type"
              required
              className="w-full px-3 py-2 rounded-md bg-(--card) dark:bg-(--card-dark)"
            >
              <option value="">Select a Account Type</option>
              <option value="checking">Checking Account</option>
              <option value="savings">Savings Account</option>
              <option value="creditCard">Credit Card</option>
            </select>

            <select
              name="institution"
              required
              className="w-full px-3 py-2 rounded-md bg-(--card) dark:bg-(--card-dark)"
            >
              <option value="">Select an Institution</option>
              <option value="chase">Chase</option>
              <option value="american-express">American Express</option>
              <option value="discover">Discover</option>
            </select>

            <input
              type="text"
              name="description"
              placeholder="Account Description (Optional)"
              required
              className="w-full px-3 py-2 rounded-md text-md bg-(--card) dark:bg-(--card-dark)"
            />

            <button
              type="submit"
              className="w-full py-2 rounded-md font-medium text-white hover:cursor-pointer bg-(--primary) dark:bg-(--primary-dark)"
            >
              Submit
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
