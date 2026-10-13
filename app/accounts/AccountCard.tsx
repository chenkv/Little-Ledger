import Image from "next/image";
import type { ReactNode } from "react";
import { financial_account_get } from "@/types/api-res-types";

type AccountCardProps = {
  account: financial_account_get;
  isActive: boolean;
  onSelect: () => void;
};

export default function AccountCard({
  account,
  isActive,
  onSelect,
}: AccountCardProps) {
  let logo: ReactNode = null;

  if (account.type === "bank") {
    logo = (
      <Image src="/bank-account.svg" alt="Bank Logo" width={50} height={50} />
    );
  } else if (account.type === "Credit Card") {
    logo = (
      <Image
        src="/card-account.svg"
        alt="Credit Card Icon"
        width={50}
        height={50}
      />
    );
  }

  return (
    <button
      type="button"
      aria-pressed={isActive}
      aria-label={`Select ${account.name} account`}
      onClick={onSelect}
      data-scroll-scale
      data-account-id={account.id}
      className={`w-[20rem] h-52 p-4 flex flex-col rounded-4xl shadow-md bg-white dark:bg-(--account-card-dark) text-black text-left shrink-0 ${
        isActive ? "ring-2 ring-(--primary) dark:ring-(--primary-dark)" : ""
      }`}
    >
      <div className="flex items-center space-x-4 mb-2">
        {logo}
        <div>
          <h2 className="text-lg">{account.name}</h2>
          <p className="text-sm text-gray-500">{account.type} ••••</p>
        </div>
      </div>
      <div className="grow" />
      <p>Institution: {account.institution}</p>
      <p>Description: {account.description}</p>
    </button>
  );
}
