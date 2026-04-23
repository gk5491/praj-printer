import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

export default function Settings() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    slackAlerts: false,
    autoDriverDeploy: true,
    remoteMonitoring: true,
    maintenanceAlerts: true,
    quotaWarnings: true,
  });

  const toggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-lg font-bold">Settings</h1>

      <Card className="shadow-none">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm font-semibold">System Configuration</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-3">
          <SettingRow label="Automatic Driver Deployment" desc="Auto-deploy printer drivers to new machines" checked={settings.autoDriverDeploy} onChange={() => toggle("autoDriverDeploy")} />
          <Separator />
          <SettingRow label="Remote Monitoring" desc="Enable remote printer health monitoring" checked={settings.remoteMonitoring} onChange={() => toggle("remoteMonitoring")} />
          <Separator />
          <SettingRow label="Maintenance Alerts" desc="Get alerts when printers need maintenance" checked={settings.maintenanceAlerts} onChange={() => toggle("maintenanceAlerts")} />
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm font-semibold">Notifications</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-3">
          <SettingRow label="Email Notifications" desc="Receive print reports and alerts via email" checked={settings.emailNotifications} onChange={() => toggle("emailNotifications")} />
          <Separator />
          <SettingRow label="Slack Alerts" desc="Push printer status alerts to Slack" checked={settings.slackAlerts} onChange={() => toggle("slackAlerts")} />
          <Separator />
          <SettingRow label="Quota Warnings" desc="Alert users when approaching print quota limits" checked={settings.quotaWarnings} onChange={() => toggle("quotaWarnings")} />
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm font-semibold">Roles & Permissions</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="space-y-2">
            {[
              { role: "Admin", perms: ["Full system access", "User management", "Policy control", "Reports"] },
              { role: "Manager", perms: ["Department reports", "Quota management", "Printer monitoring"] },
              { role: "Employee", perms: ["Submit print jobs", "View own history", "Release jobs at printer"] },
            ].map(r => (
              <div key={r.role} className="flex items-start gap-3 border rounded-md p-2">
                <Badge variant="outline" className="text-2xs mt-0.5">{r.role}</Badge>
                <div className="flex flex-wrap gap-1">
                  {r.perms.map(p => (
                    <span key={p} className="text-2xs bg-muted px-1.5 py-0.5 rounded">{p}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-xs font-medium">{label}</div>
        <div className="text-2xs text-muted-foreground">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
