import { MoneyDashboard } from "@/components/MoneyDashboard";
import { PageHeader } from "@/components/PageHeader";
import { getSavingsGoals, getTransactions } from "@/lib/api";
import { friendlyDate } from "@/lib/date";

export default async function MoneyPage() {
  const [{ transactions }, { savingsGoals }] = await Promise.all([getTransactions(), getSavingsGoals()]);

  return (
    <div>
      <PageHeader title="Money" subtitle={friendlyDate()} />
      <MoneyDashboard initialTransactions={transactions} initialSavingsGoals={savingsGoals} />
    </div>
  );
}
