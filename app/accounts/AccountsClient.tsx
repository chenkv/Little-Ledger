"use client";

import useSWR from "swr";
import { useState } from "react";
import { financial_account_get } from "@/types/api-res-types";
import AccountCarousel from "./AccountCarousel";
import CreateAccountPopup from "./CreateAccountPopup";

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
  const [enableAccountPopup, setEnableAccountPopup] = useState<boolean>(false);

  return (
    <div>
      <AccountCarousel
        accounts={data?.accounts ?? []}
        isLoading={isLoading}
        hasError={Boolean(error)}
        enableAccountPopup={enableAccountPopup}
        setEnableAccountPopup={setEnableAccountPopup}
      />

      {enableAccountPopup && (
        <CreateAccountPopup
          setEnableAccountPopup={setEnableAccountPopup}
          mutate={mutate}
        />
      )}
    </div>
  );
}
