import MonthlySummary from "./_components/MonthlySummary";

export default function SpendingAnalysis() {
  return (
    <div className="flex-1 mt-6 px-2 rounded-tr-3xl bg-(--surface-dark)">
      <MonthlySummary />

      <div className="border-b-2 border-(--border) dark:border-(--border-dark) last:border-none">
        Test
      </div>
    </div>
  );
}
