import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { storage } from "@/lib/storage";
import type { Printer } from "@/lib/storage";
import { Search, MapPin, Loader2 } from "lucide-react";
import { useEffect } from "react";

type PrinterStatus = 'online' | 'offline' | 'warning' | 'error';
type HistoryEntry = {
  printerName?: string;
  printerIP?: string;
  status?: string;
  createdAt?: string;
  colorMode?: 'bw' | 'color';
};

const statusColors: Record<PrinterStatus, string> = {
  online: "bg-success",
  offline: "bg-destructive",
  warning: "bg-warning",
  error: "bg-destructive",
};

const statusBadge: Record<PrinterStatus, string> = {
  online: "bg-success/10 text-success border-success/20",
  offline: "bg-destructive/10 text-destructive border-destructive/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
};

const normalizeStatus = (status?: string): PrinterStatus => {
  if (status === "online" || status === "offline" || status === "warning" || status === "error") return status;
  return "online";
};

const normalizeType = (type?: string): "color" | "bw" => (type === "color" ? "color" : "bw");

const normalizePrinter = (raw: any): Printer => ({
  id: raw.id || `p-${(raw.name || raw.ip || "unknown").toString().toLowerCase().replace(/\s+/g, "-")}`,
  name: raw.name || "Unknown Printer",
  location: raw.location || "Previously used",
  status: normalizeStatus(raw.status),
  type: normalizeType(raw.type),
  tonerLevel: Number.isFinite(raw.tonerLevel) ? raw.tonerLevel : 100,
  paperLevel: Number.isFinite(raw.paperLevel) ? raw.paperLevel : 100,
  jobCount: Number.isFinite(raw.jobCount) ? raw.jobCount : 0,
  ip: raw.ip || raw.printerIP || "-",
  model: raw.model || "Unknown Model",
  totalPrints: Number.isFinite(raw.totalPrints) ? raw.totalPrints : 0,
  lastMaintenance: raw.lastMaintenance || "Not recorded",
});

const deriveHistoryPrinters = (localJobs: ReturnType<typeof storage.getJobs>, history: HistoryEntry[] = []): Printer[] => {
  const byName = new Map<string, Printer>();

  localJobs.forEach((job) => {
    const name = job.printer_name || "System Printer";
    const key = name.toLowerCase();
    const current = byName.get(key);
    const pages = Number(job.pages || 0);

    byName.set(
      key,
      normalizePrinter({
        id: current?.id || `hist-${key.replace(/\s+/g, "-")}`,
        name,
        location: current?.location || "Print History",
        status: current?.status || "online",
        type: current?.type || (job.color_mode === "color" ? "color" : "bw"),
        ip: current?.ip || "-",
        model: current?.model || "Historical",
        jobCount: (current?.jobCount || 0) + 1,
        totalPrints: (current?.totalPrints || 0) + pages,
        tonerLevel: current?.tonerLevel ?? 100,
        paperLevel: current?.paperLevel ?? 100,
        lastMaintenance: current?.lastMaintenance || "From history",
      }),
    );
  });

  history.forEach((entry) => {
    const name = entry.printerName || "Unknown Printer";
    const key = name.toLowerCase();
    const current = byName.get(key);
    byName.set(
      key,
      normalizePrinter({
        id: current?.id || `apihist-${key.replace(/\s+/g, "-")}`,
        name,
        location: current?.location || "API History",
        status: current?.status || (entry.status === "failed" ? "warning" : "online"),
        type: current?.type || normalizeType(entry.colorMode),
        ip: current?.ip !== "-" ? current?.ip : entry.printerIP || "-",
        model: current?.model || "Historical",
        jobCount: (current?.jobCount || 0) + 1,
        totalPrints: current?.totalPrints || 0,
        tonerLevel: current?.tonerLevel ?? 100,
        paperLevel: current?.paperLevel ?? 100,
        lastMaintenance: current?.lastMaintenance || "From history",
      }),
    );
  });

  return Array.from(byName.values());
};

const mergePrinters = (...lists: Printer[][]): Printer[] => {
  const merged = new Map<string, Printer>();
  lists.flat().forEach((printer) => {
    const normalized = normalizePrinter(printer);
    const key = normalized.name.toLowerCase();
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, normalized);
      return;
    }
    merged.set(
      key,
      normalizePrinter({
        ...existing,
        ...normalized,
        status: existing.status === "online" || normalized.status === "online" ? "online" : normalized.status,
        jobCount: Math.max(existing.jobCount || 0, normalized.jobCount || 0),
        totalPrints: Math.max(existing.totalPrints || 0, normalized.totalPrints || 0),
      }),
    );
  });
  return Array.from(merged.values());
};

export default function Printers() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Printer | null>(null);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrinters = async () => {
      const localPrinters = (storage.getPrinters() || []).map(normalizePrinter);
      const localHistoryPrinters = deriveHistoryPrinters(storage.getJobs() || []);
      const initial = mergePrinters(localPrinters, localHistoryPrinters);
      setPrinters(initial);

      try {
        const [printersResult, historyResult] = await Promise.allSettled([
          fetch('/api/printers'),
          fetch('/api/history'),
        ]);

        const apiPrinters =
          printersResult.status === "fulfilled" && printersResult.value.ok
            ? ((await printersResult.value.json()) || []).map((p: any) => normalizePrinter(p))
            : [];

        const apiHistory =
          historyResult.status === "fulfilled" && historyResult.value.ok
            ? ((await historyResult.value.json()) || [])
            : [];

        const historyPrinters = deriveHistoryPrinters(storage.getJobs() || [], apiHistory);
        const merged = mergePrinters(apiPrinters, initial, historyPrinters);
        setPrinters(merged);
        if (merged.length > 0) storage.setPrinters(merged);
      } catch (error) {
        console.error('Failed to fetch real printers:', error);
        setPrinters(initial);
      } finally {
        setLoading(false);
      }
    };
    fetchPrinters();
  }, []);

  const filtered = printers.filter(p =>
    (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.location || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Printer Management</h1>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" /> {printers.filter(p => p.status === "online").length} Online</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" /> {printers.filter(p => p.status === "warning").length} Warning</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" /> {printers.filter(p => p.status === "offline" || p.status === "error").length} Offline</span>
        </div>
      </div>

      <div className="flex gap-3">
        <div className={`flex-1 ${selected ? "lg:w-2/3" : ""}`}>
          <div className="relative mb-3">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search printers..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-7 text-xs" />
          </div>

          <Card className="shadow-none min-h-[300px]">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground animate-pulse">Scanning system for hardware...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-2xs h-8 w-8"></TableHead>
                    <TableHead className="text-2xs h-8">Name</TableHead>
                    <TableHead className="text-2xs h-8">Location</TableHead>
                    <TableHead className="text-2xs h-8">Type</TableHead>
                    <TableHead className="text-2xs h-8">IP Address</TableHead>
                    <TableHead className="text-2xs h-8">Jobs</TableHead>
                    <TableHead className="text-2xs h-8">Toner</TableHead>
                    <TableHead className="text-2xs h-8">Paper</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-20 text-center text-muted-foreground italic text-xs">
                        No printers connected. Please connect a USB or Network printer.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(p => (
                      <TableRow
                        key={p.id}
                        className={`cursor-pointer ${selected?.id === p.id ? "bg-accent" : ""}`}
                        onClick={() => setSelected(p)}
                      >
                        <TableCell className="py-1.5 px-2">
                          <span className={`h-2 w-2 rounded-full inline-block ${statusColors[p.status]}`} />
                        </TableCell>
                        <TableCell className="text-xs py-1.5 font-medium">{p.name}</TableCell>
                        <TableCell className="text-xs py-1.5 text-muted-foreground">{p.location}</TableCell>
                        <TableCell className="text-xs py-1.5">
                          <Badge variant="outline" className="text-2xs">{p.type === "color" ? "Color" : "B&W"}</Badge>
                        </TableCell>
                        <TableCell className="text-xs py-1.5 font-mono text-muted-foreground">{p.ip}</TableCell>
                        <TableCell className="text-xs py-1.5">{p.jobCount}</TableCell>
                        <TableCell className="text-xs py-1.5">
                          <div className="flex items-center gap-1.5">
                            <Progress value={p.tonerLevel} className="h-1.5 w-12" />
                            <span className="text-2xs text-muted-foreground">{p.tonerLevel}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs py-1.5">
                          <div className="flex items-center gap-1.5">
                            <Progress value={p.paperLevel} className="h-1.5 w-12" />
                            <span className="text-2xs text-muted-foreground">{p.paperLevel}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>

        {/* Detail Panel */}
        {selected && (
          <Card className="hidden lg:block w-80 shadow-none shrink-0 self-start">
            <CardHeader className="p-3 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{selected.name}</CardTitle>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium border capitalize ${statusBadge[selected.status]}`}>
                  {selected.status}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-3 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3 w-3" /> {selected.location}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Detail label="Model" value={selected.model} />
                <Detail label="IP" value={selected.ip} />
                <Detail label="Type" value={selected.type === "color" ? "Color" : "B&W"} />
                <Detail label="Total Prints" value={(selected.totalPrints || 0).toLocaleString()} />
              </div>
              <div className="space-y-2">
                <LevelBar label="Toner" value={selected.tonerLevel} />
                <LevelBar label="Paper" value={selected.paperLevel} />
              </div>
              <div className="pt-1 border-t">
                <span className="text-2xs text-muted-foreground">Last Maintenance</span>
                <div className="font-medium">{selected.lastMaintenance}</div>
              </div>
              <div className="border-t pt-3">
                <span className="text-2xs font-semibold text-primary uppercase tracking-wider">Recent Printer Logs</span>
                <div className="mt-2 space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {storage.getJobs()
                    .filter(j => j.printer_name === selected.name)
                    .slice(0, 5)
                    .map(job => (
                      <div key={job.id} className="p-2 bg-muted/30 rounded border border-border/50 text-[10px]">
                        <div className="font-medium truncate">{job.document_name}</div>
                        <div className="flex justify-between text-muted-foreground mt-1">
                          <span>User: {job.user_id}</span>
                          <span>{new Date(job.submitted_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))
                  }
                  {storage.getJobs().filter(j => j.printer_name === selected.name).length === 0 && (
                    <div className="text-center py-4 text-muted-foreground italic">No jobs recorded yet</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | number }) {
  return (
    <div>
      <span className="text-2xs text-muted-foreground">{label}</span>
      <div className="font-medium truncate">{value || "-"}</div>
    </div>
  );
}

function LevelBar({ label, value }: { label: string; value: number }) {
  const color = value > 50 ? "bg-success" : value > 20 ? "bg-warning" : "bg-destructive";
  return (
    <div>
      <div className="flex justify-between mb-0.5">
        <span className="text-2xs text-muted-foreground">{label}</span>
        <span className="text-2xs font-medium">{value}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
