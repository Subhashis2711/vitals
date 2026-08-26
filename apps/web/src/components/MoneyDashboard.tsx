"use client";

import type { SavingsGoal, Transaction } from "@vitals/shared";
import { ArrowDownRight, ArrowUpRight, Plus, Target, Trash2, Wallet } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { createSavingsGoal, createTransaction, deleteSavingsGoal, deleteTransaction } from "@/lib/api-browser";
import { cn } from "@/lib/cn";
import { todayISO } from "@/lib/date";

function last6Months(): { key: string; label: string }[] {
  const result: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const dd = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}`;
    result.push({ key, label: dd.toLocaleDateString("en-US", { month: "short" }) });
  }
  return result;
}

function formatMoney(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function MoneyDashboard({
  initialTransactions,
  initialSavingsGoals,
}: {
  initialTransactions: Transaction[];
  initialSavingsGoals: SavingsGoal[];
}) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [savingsGoals, setSavingsGoals] = useState(initialSavingsGoals);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState("");
  const [submittingTxn, setSubmittingTxn] = useState(false);

  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");

  const balance = transactions.reduce((sum, t) => sum + t.amount, 0);

  const thisMonthKey = todayISO().slice(0, 7);
  const netThisMonth = transactions
    .filter((t) => t.occurredAt.slice(0, 7) === thisMonthKey)
    .reduce((sum, t) => sum + t.amount, 0);

  const months = last6Months();
  const monthlyExpenses = months.map((m) =>
    Math.abs(
      transactions.filter((t) => t.occurredAt.slice(0, 7) === m.key && t.amount < 0).reduce((s, t) => s + t.amount, 0),
    ),
  );
  const monthsWithExpenseHistory = monthlyExpenses.filter((v) => v > 0);
  const avgMonthlyExpense =
    monthsWithExpenseHistory.length > 0
      ? monthsWithExpenseHistory.reduce((a, b) => a + b, 0) / monthsWithExpenseHistory.length
      : 0;
  const runwayMonths = avgMonthlyExpense > 0 ? balance / avgMonthlyExpense : null;

  const chartData = months.map((m) => ({
    label: m.label,
    income: transactions.filter((t) => t.occurredAt.slice(0, 7) === m.key && t.amount > 0).reduce((s, t) => s + t.amount, 0),
    expense: Math.abs(
      transactions.filter((t) => t.occurredAt.slice(0, 7) === m.key && t.amount < 0).reduce((s, t) => s + t.amount, 0),
    ),
  }));
  const chartMax = Math.max(...chartData.flatMap((d) => [d.income, d.expense]), 1);

  async function handleAddTransaction(e: FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!description.trim() || !amt) return;
    setSubmittingTxn(true);
    try {
      const signedAmount = kind === "expense" ? -Math.abs(amt) : Math.abs(amt);
      const { transaction } = await createTransaction({
        description: description.trim(),
        amount: signedAmount,
        category: category.trim() || undefined,
        occurredAt: todayISO(),
      });
      setTransactions((prev) => [transaction, ...prev]);
      setDescription("");
      setAmount("");
      setCategory("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't log transaction");
    } finally {
      setSubmittingTxn(false);
    }
  }

  async function handleDeleteTransaction(id: string) {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    await deleteTransaction(id);
  }

  async function handleAddSavingsGoal(e: FormEvent) {
    e.preventDefault();
    const target = Number(goalTarget);
    if (!goalName.trim() || !target) return;
    const { savingsGoal } = await createSavingsGoal({ name: goalName.trim(), targetAmount: target });
    setSavingsGoals((prev) => [savingsGoal, ...prev]);
    setGoalName("");
    setGoalTarget("");
  }

  async function handleDeleteSavingsGoal(id: string) {
    setSavingsGoals((prev) => prev.filter((g) => g.id !== id));
    await deleteSavingsGoal(id);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-400/20 to-cyan-500/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-cyan-200">Runway</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-50">
            {runwayMonths != null ? `${runwayMonths.toFixed(1)}mo` : "—"}
          </p>
          <p className="mt-1 text-xs text-neutral-400">balance ÷ avg monthly spend</p>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Net this month</p>
          <p className={cn("mt-1 text-2xl font-semibold", netThisMonth >= 0 ? "text-emerald-400" : "text-red-400")}>
            {formatMoney(netThisMonth)}
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Balance</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-50">{formatMoney(balance)}</p>
          <p className="mt-1 text-xs text-neutral-500">all transactions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-neutral-200">Income vs expenses · 6 months</h3>
          <div className="flex items-end gap-3" style={{ height: 100 }}>
            {chartData.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-full items-end gap-1">
                  <div
                    className="w-3 rounded-t bg-emerald-500"
                    style={{ height: Math.max((d.income / chartMax) * 100, d.income > 0 ? 4 : 0) }}
                  />
                  <div
                    className="w-3 rounded-t bg-red-500"
                    style={{ height: Math.max((d.expense / chartMax) * 100, d.expense > 0 ? 4 : 0) }}
                  />
                </div>
                <span className="text-[9px] text-neutral-600">{d.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-3 text-[10px] text-neutral-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Income
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500" /> Expenses
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-neutral-200">
            <Target className="h-4 w-4 text-cyan-300" />
            Savings goals
          </h3>
          <ul className="mb-3 space-y-3">
            {savingsGoals.map((goal) => {
              const pct =
                goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
              return (
                <li key={goal.id} className="group">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-neutral-200">{goal.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-500">{pct}%</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteSavingsGoal(goal.id)}
                        className="-m-1.5 p-1.5 text-neutral-700 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-neutral-800">
                    <div className="h-full rounded-full bg-cyan-400" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-0.5 text-[10px] text-neutral-500">
                    {formatMoney(goal.currentAmount)} / {formatMoney(goal.targetAmount)}
                  </p>
                </li>
              );
            })}
            {savingsGoals.length === 0 && <li className="text-xs text-neutral-500">No savings goals yet.</li>}
          </ul>
          <form onSubmit={handleAddSavingsGoal} className="space-y-2">
            <input
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              placeholder="Goal name..."
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-cyan-400/60 focus:outline-none"
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
                placeholder="Target $"
                className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-cyan-400/60 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!goalName.trim() || !goalTarget}
                className="rounded-lg bg-cyan-400 px-3 py-1.5 text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <h3 className="mb-3 text-sm font-semibold text-neutral-200">Recent transactions</h3>
        <form onSubmit={handleAddTransaction} className="mb-4 flex flex-wrap items-center gap-2">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description..."
            className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-cyan-400/60 focus:outline-none"
          />
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="w-28 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-cyan-400/60 focus:outline-none"
          />
          <div className="flex overflow-hidden rounded-lg border border-neutral-700">
            <button
              type="button"
              onClick={() => setKind("expense")}
              className={cn(
                "px-3 py-2 text-sm",
                kind === "expense" ? "bg-red-500/20 text-red-400" : "bg-neutral-950 text-neutral-500",
              )}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setKind("income")}
              className={cn(
                "px-3 py-2 text-sm",
                kind === "income" ? "bg-emerald-500/20 text-emerald-400" : "bg-neutral-950 text-neutral-500",
              )}
            >
              Income
            </button>
          </div>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category (optional)"
            className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-cyan-400/60 focus:outline-none"
          />
          <button
            type="submit"
            disabled={submittingTxn || !description.trim() || !amount}
            className="flex items-center gap-1.5 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Log transaction
          </button>
        </form>
        <ul className="space-y-1.5">
          {transactions.slice(0, 10).map((t) => (
            <li
              key={t.id}
              className="group flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950/60 p-2 text-sm"
            >
              <div className="flex min-w-0 items-center gap-2">
                {t.amount >= 0 ? (
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5 shrink-0 text-red-500" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-neutral-200">{t.description}</p>
                  <p className="truncate text-xs text-neutral-500">
                    {t.category ?? "Uncategorized"} · {t.occurredAt}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={cn("font-medium", t.amount >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {formatMoney(t.amount)}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteTransaction(t.id)}
                  className="-m-1.5 p-1.5 text-neutral-600 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
          {transactions.length === 0 && (
            <li className="flex flex-col items-center gap-2 py-8 text-sm text-neutral-500">
              <Wallet className="h-6 w-6" />
              No transactions yet.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
