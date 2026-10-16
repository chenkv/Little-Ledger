"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";
import Image from "next/image";
import type { financial_account_get } from "@/types/api-res-types";
import AccountCard from "./AccountCard";

type AccountCarouselProps = {
  accounts: financial_account_get[];
  isLoading: boolean;
  hasError: boolean;
  selectedAccountId?: number | null;
  setAccountPopup: (value: boolean) => void;
  setSelectedAccountId: (value: number | null) => void;
};

export default function AccountCarousel({
  accounts,
  isLoading,
  hasError,
  selectedAccountId,
  setAccountPopup,
  setSelectedAccountId,
}: AccountCarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startScrollLeft: number;
    isDragging: boolean;
  } | null>(null);
  const didDragRef = useRef(false);

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
    setSelectedAccountId(accountId);

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
    if (!carousel || isLoading || hasError) return;

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
  }, [accounts, hasError, isLoading]);

  return (
    <div
      ref={carouselRef}
      style={{
        paddingInline: "max(0px, calc((100% - 20rem) / 2))",
        scrollbarWidth: "none",
      }}
      className="relative py-8 flex items-center justify-start space-x-6 overflow-x-scroll scrollbar-hidden cursor-grab active:cursor-grabbing select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onClickCapture={handleCarouselClick}
    >
      {isLoading ? (
        <section className="p-6 rounded-xl bg-(--surface) dark:bg-(--surface-dark) shadow space-y-4 flex-1">
          Loading...
        </section>
      ) : hasError ? (
        <section className="p-6 rounded-xl bg-(--surface) dark:bg-(--surface-dark) shadow space-y-4 flex-1">
          Error! Failed to load.
        </section>
      ) : (
        <>
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              isActive={selectedAccountId === account.id}
              onSelect={() => handleAccountSelect(account.id)}
            />
          ))}
          <div
            data-scroll-scale
            className="w-[4rem] h-[4rem] flex flex-col rounded-full shadow-md bg-white dark:bg-(--account-card-dark) items-center justify-center cursor-pointer hover:shadow-lg transition-shadow duration-300 shrink-0"
            onClick={() => {
              setAccountPopup(true);
            }}
          >
            <Image
              src="/add-account.svg"
              alt="Add Account"
              width={24}
              height={24}
            />
          </div>
        </>
      )}
    </div>
  );
}
