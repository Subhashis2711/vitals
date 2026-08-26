import { PageHeader } from "@/components/PageHeader";
import { SettingsView } from "@/components/SettingsView";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" />
      <SettingsView />
    </div>
  );
}
