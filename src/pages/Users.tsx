import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { storage } from "@/lib/storage";
import { Search } from "lucide-react";

const authColors: Record<string, string> = {
  PIN: "bg-primary/10 text-primary border-primary/20",
  RFID: "bg-success/10 text-success border-success/20",
  SSO: "bg-warning/10 text-warning border-warning/20",
  QR: "bg-accent text-accent-foreground border-border",
};

export default function Users() {
  const [search, setSearch] = useState("");
  const users = storage.getUsers();

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.department.toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">User Management</h1>
        <span className="text-xs text-muted-foreground">{users.length} users</span>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-7 text-xs" />
      </div>

      <Card className="shadow-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-2xs h-8">Name</TableHead>
              <TableHead className="text-2xs h-8">Email</TableHead>
              <TableHead className="text-2xs h-8">Department</TableHead>
              <TableHead className="text-2xs h-8">Role</TableHead>
              <TableHead className="text-2xs h-8">Auth</TableHead>
              <TableHead className="text-2xs h-8">Quota Usage</TableHead>
              <TableHead className="text-2xs h-8 text-right">Cost</TableHead>
              <TableHead className="text-2xs h-8">Status</TableHead>
              <TableHead className="text-2xs h-8">Last Print</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(u => {
              const used = u.usedPages || 0;
              const quota = u.monthlyQuota || 500;
              const quotaPct = Math.min(Math.round((used / quota) * 100), 100);
              return (
                <TableRow key={u.id}>
                  <TableCell className="text-xs py-1.5 font-medium">{u.name}</TableCell>
                  <TableCell className="text-xs py-1.5 text-muted-foreground">{u.email || 'N/A'}</TableCell>
                  <TableCell className="text-xs py-1.5">{u.department}</TableCell>
                  <TableCell className="text-xs py-1.5">
                    <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-2xs capitalize">{u.role}</Badge>
                  </TableCell>
                  <TableCell className="text-xs py-1.5">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium border ${authColors[u.authMethod || 'PIN']}`}>
                      {u.authMethod || 'PIN'}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs py-1.5">
                    <div className="flex items-center gap-2">
                      <Progress value={quotaPct} className="h-1.5 w-16" />
                      <span className="text-2xs text-muted-foreground whitespace-nowrap">{used}/{quota}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs py-1.5 text-right">${(u.totalCost || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-xs py-1.5">
                    <span className={`h-2 w-2 rounded-full inline-block ${u.status === "active" ? "bg-success" : "bg-muted-foreground"}`} />
                  </TableCell>
                  <TableCell className="text-xs py-1.5 text-muted-foreground whitespace-nowrap">
                    {u.lastPrint ? new Date(u.lastPrint).toLocaleDateString() : 'Never'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
