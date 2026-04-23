import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Search, Download, Shield } from "lucide-react";
import { toast } from "sonner";
import { storage } from "@/lib/storage";

const chartConfig = {
  pages: { label: "Pages", color: "hsl(var(--primary))" },
  cost: { label: "Cost ($)", color: "hsl(var(--warning))" },
};

export default function Reports() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const stats = storage.getStats();
  const jobs = storage.getJobs();

  // Audit log is simulated by jobs for now
  const auditLog = jobs.map(j => ({
    id: j.id,
    timestamp: j.submitted_at,
    userName: j.userName,
    action: j.status === 'completed' ? 'Print Completed' : 'Print Submitted',
    printerName: j.printer_name || 'System Printer',
    pages: j.pages,
    cost: j.cost,
    details: `${j.document_name} print requested`
  }));

  const actions = [...new Set(auditLog.map(a => a.action))];

  const filtered = auditLog.filter(e => {
    const matchSearch = !search || e.userName.toLowerCase().includes(search.toLowerCase()) || e.details.toLowerCase().includes(search.toLowerCase());
    const matchAction = actionFilter === "all" || e.action === actionFilter;
    return matchSearch && matchAction;
  });

  const handleExport = () => {
    toast.success("Report exported as CSV (simulated)");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Reports & Audit</h1>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleExport}>
          <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Summary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="shadow-none">
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-sm font-semibold">Department Comparison</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-2">
            <ChartContainer config={chartConfig} className="h-[180px] w-full">
              <BarChart data={stats.departmentCostData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="department" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-sm font-semibold">Volume Trends</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-2">
            <ChartContainer config={chartConfig} className="h-[180px] w-full">
              <BarChart data={stats.printVolumeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="hsl(var(--warning))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Compliance */}
      <div className="flex gap-3">
        {["SOX Compliance", "GDPR Data Handling", "ISO 27001"].map(item => (
          <Card key={item} className="shadow-none flex-1">
            <CardContent className="p-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-success" />
              <div>
                <div className="text-xs font-medium">{item}</div>
                <div className="text-2xs text-success">Compliant</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Audit Log */}
      <Card className="shadow-none">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm font-semibold">Audit Log</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search log..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-7 text-xs" />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-8 w-48 text-xs">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-2xs h-8">Timestamp</TableHead>
                <TableHead className="text-2xs h-8">User</TableHead>
                <TableHead className="text-2xs h-8">Action</TableHead>
                <TableHead className="text-2xs h-8">Printer</TableHead>
                <TableHead className="text-2xs h-8">Pages</TableHead>
                <TableHead className="text-2xs h-8 text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 30).map(e => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs py-1.5 text-muted-foreground whitespace-nowrap">
                    {new Date(e.timestamp).toLocaleDateString()} {new Date(e.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </TableCell>
                  <TableCell className="text-xs py-1.5 font-medium">{e.userName}</TableCell>
                  <TableCell className="text-xs py-1.5">{e.action}</TableCell>
                  <TableCell className="text-xs py-1.5 text-muted-foreground">{e.printerName || "—"}</TableCell>
                  <TableCell className="text-xs py-1.5">{e.pages ?? "—"}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right">{e.cost ? `$${e.cost.toFixed(2)}` : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
