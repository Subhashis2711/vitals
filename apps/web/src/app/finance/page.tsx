import { FinanceDashboard } from "@/components/FinanceDashboard";
import { PageHeader } from "@/components/PageHeader";
import { getSavingsGoals, getTransactions } from "@/lib/api";
import { friendlyDate } from "@/lib/date";

export default async function FinancePage() {
  const [{ transactions }, { savingsGoals }] = await Promise.all([getTransactions(), getSavingsGoals()]);

  return (
    <div>
      <PageHeader title="Finance" subtitle={friendlyDate()} />
      <FinanceDashboard initialTransactions={transactions} initialSavingsGoals={savingsGoals} />
    </div>
  );
}
