import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRole } from "@/contexts/RoleContext";
import { Search, Send, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { storage } from "@/lib/storage";

const statusStyles: Record<string, string> = {
  completed: "bg-success/10 text-success border-success/20",
  queued: "bg-primary/10 text-primary border-primary/20",
  printing: "bg-warning/10 text-warning border-warning/20",
  cancelled: "bg-muted text-muted-foreground border-border",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function PrintJobs() {
  const { role, currentUserId } = useRole();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [realJobs, setRealJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const jobs = storage.getJobs();
    const filtered = role === "admin" ? jobs : jobs.filter(j => j.user_id === currentUserId);
    setRealJobs(filtered);
    setLoading(false);
  }, [role, currentUserId]);

  const jobs = useMemo(() => {
    let list = realJobs;
    if (search) {
      list = list.filter(j =>
        (j.document_name || j.documentName).toLowerCase().includes(search.toLowerCase()) ||
        (j.userName || "").toLowerCase().includes(search.toLowerCase())
      );
    }
    if (statusFilter !== "all") {
      list = list.filter(j => j.status === statusFilter);
    }
    return list;
  }, [realJobs, search, statusFilter]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">
        {role === "admin" ? "All Print Jobs" : "My Print Jobs"}
      </h1>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-7 text-xs" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="printing">Printing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{jobs.length} jobs</span>
      </div>

      <Card className="shadow-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-2xs h-8">Document</TableHead>
              {role === "admin" && <TableHead className="text-2xs h-8">User</TableHead>}
              {role === "admin" && <TableHead className="text-2xs h-8">User ID</TableHead>}
              {role === "admin" && <TableHead className="text-2xs h-8">Department</TableHead>}
              <TableHead className="text-2xs h-8">Printer</TableHead>
              <TableHead className="text-2xs h-8">Pages</TableHead>
              <TableHead className="text-2xs h-8">Mode</TableHead>
              <TableHead className="text-2xs h-8">Duplex</TableHead>
              <TableHead className="text-2xs h-8">Status</TableHead>
              <TableHead className="text-2xs h-8 text-right">Cost</TableHead>
              <TableHead className="text-2xs h-8">Submitted</TableHead>
              {role === "employee" && <TableHead className="text-2xs h-8">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map(job => (
              <TableRow key={job.id}>
                <TableCell className="text-xs py-1.5 font-medium max-w-[180px] truncate">{job.document_name || job.documentName}</TableCell>
                {role === "admin" && (
                  <TableCell className="text-xs py-1.5 font-medium">
                    {job.userName || 'User'}
                  </TableCell>
                )}
                {role === "admin" && (
                  <TableCell className="text-xs py-1.5 font-mono text-muted-foreground">
                    {job.user_id}
                  </TableCell>
                )}
                {role === "admin" && <TableCell className="text-xs py-1.5 text-muted-foreground">{job.department || 'N/A'}</TableCell>}
                <TableCell className="text-xs py-1.5">{job.printer_name || job.printerName || 'System Printer'}</TableCell>
                <TableCell className="text-xs py-1.5">{job.pages} × {job.copies || 1}</TableCell>
                <TableCell className="text-xs py-1.5">
                  <Badge variant="outline" className="text-2xs">{(job.color_mode || job.colorMode) === "color" ? "Color" : "B&W"}</Badge>
                </TableCell>
                <TableCell className="text-xs py-1.5">{job.duplex ? "Yes" : "No"}</TableCell>
                <TableCell className="text-xs py-1.5">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium border capitalize ${statusStyles[job.status]}`}>
                    {job.status}
                  </span>
                </TableCell>
                <TableCell className="text-xs py-1.5 text-right">${job.cost.toFixed(2)}</TableCell>
                <TableCell className="text-xs py-1.5 text-muted-foreground whitespace-nowrap">
                  {new Date(job.submitted_at || job.submittedAt).toLocaleDateString()} {new Date(job.submitted_at || job.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </TableCell>
                {role === "employee" && (
                  <TableCell className="text-xs py-1.5">
                    {job.status === "queued" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-6 text-2xs px-2" onClick={() => toast.success("Job released to printer")}>
                          <Send className="h-3 w-3 mr-1" /> Release
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 text-2xs px-1.5 text-destructive" onClick={() => toast("Job cancelled")}>
                          <XCircle className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
