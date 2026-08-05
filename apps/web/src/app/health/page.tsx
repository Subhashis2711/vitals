import { HealthDashboard } from "@/components/HealthDashboard";
import { PageHeader } from "@/components/PageHeader";
import { getHealthActivityLogs, getHealthDailyLogs } from "@/lib/api";
import { friendlyDate } from "@/lib/date";

export default async function HealthPage() {
  const [{ logs: dailyLogs }, { logs: activityLogs }] = await Promise.all([
    getHealthDailyLogs(),
    getHealthActivityLogs(),
  ]);

  return (
    <div>
      <PageHeader title="Health" subtitle={friendlyDate()} />
      <HealthDashboard initialDailyLogs={dailyLogs} initialActivityLogs={activityLogs} />
    </div>
  );
}
