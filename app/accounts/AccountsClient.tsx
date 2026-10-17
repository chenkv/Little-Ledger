"use client";

import useSWR from "swr";
import { useState } from "react";
import { financial_account_get } from "@/types/api-res-types";
import AccountCarousel from "./AccountCarousel";
import AccountTransactions from "./AccountTransactions";
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
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null,
  );
  const [accountPopup, setAccountPopup] = useState<boolean>(false);

  return (
    <div>
      {accountPopup && (
        <CreateAccountPopup
          setAccountPopup={setAccountPopup}
          onAccountCreated={async () => {
            setAccountPopup(false);
            await mutate();
          }}
        />
      )}

      <AccountCarousel
        accounts={data?.accounts ?? []}
        isLoading={isLoading}
        hasError={Boolean(error)}
        setAccountPopup={setAccountPopup}
        selectedAccountId={selectedAccountId}
        setSelectedAccountId={setSelectedAccountId}
      />

      <AccountTransactions
        accounts={data?.accounts ?? []}
        accountId={selectedAccountId}
      />
    </div>
  );
}
