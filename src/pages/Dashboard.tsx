import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Printer, FileText, DollarSign, Leaf, Clock, AlertTriangle, Upload, Search, Wifi, Bluetooth, Usb, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRole } from "@/contexts/RoleContext";
import { storage } from "@/lib/storage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";

const volumeChartConfig = {
  bw: { label: "B&W", color: "hsl(var(--primary))" },
  color: { label: "Color", color: "hsl(var(--warning))" },
};

const deptChartConfig = {
  cost: { label: "Cost ($)", color: "hsl(var(--primary))" },
};

const ratioChartConfig = {
  "B&W": { label: "B&W", color: "hsl(var(--primary))" },
  Color: { label: "Color", color: "hsl(var(--warning))" },
};

export default function Dashboard() {
  const { role, currentUserId } = useRole();
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(storage.getStats());

  useEffect(() => {
    const jobs = storage.getJobs();
    const filtered = role === "admin" ? jobs : jobs.filter(j => j.user_id === currentUserId);
    setRecentJobs(filtered.slice(0, 10));
    setStats(storage.getStats());
  }, [role, currentUserId]);

  const kpis = [
    { label: "Prints Today", value: stats.kpis.totalPrintsToday, icon: FileText, color: "text-primary" },
    { label: "Active Printers", value: `${stats.kpis.activePrinters}/${stats.kpis.totalPrinters}`, icon: Printer, color: "text-success" },
    { label: "Cost This Month", value: `$${stats.kpis.costThisMonth.toLocaleString()}`, icon: DollarSign, color: "text-warning" },
    { label: "Paper Saved (Duplex)", value: `${stats.kpis.paperSavedDuplex.toLocaleString()} pages`, icon: Leaf, color: "text-success" },
    { label: "Pending Jobs", value: stats.kpis.pendingJobs, icon: Clock, color: "text-primary" },
    { label: "Printer Alerts", value: stats.kpis.totalPrinters - stats.kpis.activePrinters, icon: AlertTriangle, color: "text-destructive" },
  ];

  const printerAlerts = storage.getPrinters().filter(p => p.status !== "online");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">
          {role === "admin" ? "Admin Dashboard" : "My Dashboard"}
        </h1>
        <QuickPrint />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="shadow-none">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                <span className="text-2xs text-muted-foreground">{kpi.label}</span>
              </div>
              <div className="text-lg font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Print Volume */}
        <Card className="lg:col-span-2 shadow-none">
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-sm font-semibold">Print Volume (March)</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-2">
            <ChartContainer config={volumeChartConfig} className="h-[200px] w-full">
              <LineChart data={stats.printVolumeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="bw" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="color" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Color vs B&W Ratio */}
        <Card className="shadow-none">
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-sm font-semibold">Color vs B&W Ratio</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-2 flex items-center justify-center">
            <ChartContainer config={ratioChartConfig} className="h-[200px] w-full">
              <PieChart>
                <Pie data={stats.colorRatioData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" nameKey="name">
                  {stats.colorRatioData.map((entry: any, idx: number) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Department Cost + Printer Alerts */}
      {role === "admin" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card className="shadow-none">
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-sm font-semibold">Department Costs</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-2">
              <ChartContainer config={deptChartConfig} className="h-[180px] w-full">
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
              <CardTitle className="text-sm font-semibold">Printer Alerts</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-2">
              {printerAlerts.length === 0 ? (
                <p className="text-xs text-muted-foreground">All printers operational</p>
              ) : (
                <div className="space-y-2">
                  {printerAlerts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-xs border rounded-md p-2">
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-muted-foreground">{p.location}</div>
                      </div>
                      <Badge
                        variant={p.status === "offline" || p.status === "error" ? "destructive" : "secondary"}
                        className="text-2xs capitalize"
                      >
                        {p.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Activity */}
      <Card className="shadow-none">
        <CardHeader className="p-3 pb-0">
          <CardTitle className="text-sm font-semibold">Recent Print Jobs</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-2xs h-8">Document</TableHead>
                <TableHead className="text-2xs h-8">User</TableHead>
                <TableHead className="text-2xs h-8">Printer</TableHead>
                <TableHead className="text-2xs h-8">Pages</TableHead>
                <TableHead className="text-2xs h-8">Status</TableHead>
                <TableHead className="text-2xs h-8 text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="text-xs py-1.5 font-medium">{job.document_name || job.documentName}</TableCell>
                  <TableCell className="text-xs py-1.5">{job.userName || 'User'}</TableCell>
                  <TableCell className="text-xs py-1.5">{job.printer_name || job.printerName || 'System Printer'}</TableCell>
                  <TableCell className="text-xs py-1.5">{job.pages}</TableCell>
                  <TableCell className="text-xs py-1.5">
                    <StatusBadge status={job.status} />
                  </TableCell>
                  <TableCell className="text-xs py-1.5 text-right">${job.cost.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function QuickPrint() {
  const { currentUserId } = useRole();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [colorMode, setColorMode] = useState("bw");
  const [duplex, setDuplex] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [pages, setPages] = useState(1);

  const [printers, setPrinters] = useState<any[]>([]);

  const handleStartScan = async () => {
    setScanning(true);
    setStep(2);
    try {
      const response = await fetch('/api/printers');
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      const mapped = data.map((p: any) => ({
        ...p,
        icon: p.type === 'color' ? Wifi : Usb,
        color: 'text-success',
        typeDisplay: p.type === 'color' ? 'Color Network' : 'B&W USB'
      }));
      setPrinters(mapped);
      if (mapped.length > 0) {
        storage.setPrinters(mapped);
      }
    } catch (error) {
      console.error('Failed to fetch real printers:', error);
      setPrinters([]);
    } finally {
      setScanning(false);
    }
  };

  const countPdfPages = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      if (file.type !== 'application/pdf') {
        resolve(1);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        // Naive but effective way to count pages in many PDFs without a heavy library
        const matches = content.match(/\/Type\s*\/Page\b/g);
        resolve(matches ? matches.length : 1);
      };
      reader.readAsBinaryString(file);
    });
  };

  const printAuditSlip = (job: any, url?: string | null) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const isImage = file?.type.startsWith('image/');
    const isPdf = file?.type === 'application/pdf';

    const html = `
      <html>
        <head>
          <title>${job.document_name} - Print</title>
          <style>
            body { margin: 0; padding: 0; font-family: sans-serif; background: #fff; }
            .document-container { 
              padding: 0; 
              width: 100%; 
              height: 100%;
              display: flex; 
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            img { 
              max-width: 100%; 
              max-height: 100vh; 
              height: auto; 
              width: auto;
              display: block; 
              object-fit: contain;
            }
            embed { 
              width: 100%; 
              height: 100vh; 
              border: none; 
            }
            @media print { 
              .document-container { margin: 0; width: 100%; height: 100vh; overflow: hidden; }
              body { margin: 0; overflow: hidden; }
              img, embed { 
                max-width: 100%; 
                max-height: 100%; 
                page-break-inside: avoid; 
              }
              @page { 
                margin: 0; 
                size: auto; 
              }
            }
          </style>
        </head>
        <body>
          ${url ? `
            <div class="document-container">
              ${isImage ? `<img src="${url}" style="width: 100%; display: block;" />` : 
                isPdf ? `<embed src="${url}" type="application/pdf" width="100%" height="1100px" />` :
                `<div style="padding: 50px; text-align: center; border: 1px solid #eee; margin: 20px;">
                  <h1 style="font-size: 1.5em; color: #333;">${job.document_name}</h1>
                  <p style="color: #666;">Document ready for printing.</p>
                </div>`
              }
            </div>
          ` : ''}

          <script>
            window.onload = function() { 
              setTimeout(() => {
                window.print(); 
              }, 1000);
            }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleUpload = () => {
    if (!file || !selectedPrinter) {
      toast.error("No printer selected or file missing", {
        description: "Please ensure a printer is connected and a file is uploaded."
      });
      return;
    }

    // Double check if printer still exists in current list
    const printerExists = printers.find(p => p.id === selectedPrinter);
    if (!printerExists && printers.length > 0) {
      toast.error("Printer connection lost", {
        description: "The selected printer is no longer detected. Please re-scan."
      });
      return;
    }

    if (printers.length === 0) {
      toast.error("NOT CONNECTED!!", {
        description: "No USB, WiFi, or Bluetooth printers detected. Please connect a device."
      });
      return;
    }

    setLoading(true);
    
    // Simulate "Communicating with Printer Auditor..."
    // In a real system, the auditor gets the actual page count from the hardware
    setTimeout(() => {
      try {
        const printer = printers.find(p => p.id === selectedPrinter);
        const newJob = storage.addJob({
          user_id: currentUserId,
          document_name: file.name,
          color_mode: colorMode as 'bw' | 'color',
          duplex: duplex,
          pages: pages,
          printer_name: printer?.name || 'Unknown Printer',
          status: 'completed', 
        });
        
        toast.success(`Job Sent! Printing ${pages} pages on ${printer?.name}`);
        printAuditSlip(newJob, previewUrl);
        
        setOpen(false);
        setFile(null);
        setStep(1);
        setPages(1);
        setSelectedPrinter(null);
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        toast.error("Print failed");
      } finally {
        setLoading(false);
      }
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all active:scale-95">
          <Printer className="h-4 w-4 mr-2" /> Quick Print
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{step === 1 ? "1. Print Settings" : "2. Select Device"}</DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Select Document</Label>
              <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${file ? 'border-primary/50 bg-primary/5' : 'border-muted hover:border-primary/30'}`}>
                <input 
                  type="file" 
                  id="file-upload" 
                  className="hidden" 
                  onChange={async (e) => {
                    const selectedFile = e.target.files?.[0] || null;
                    setFile(selectedFile);
                    if (selectedFile) {
                      if (previewUrl) URL.revokeObjectURL(previewUrl);
                      setPreviewUrl(URL.createObjectURL(selectedFile));
                      
                      // Auto-detect pages for PDF
                      if (selectedFile.type === 'application/pdf') {
                        const count = await countPdfPages(selectedFile);
                        setPages(count);
                        toast.info(`Detected ${count} pages in PDF`);
                      } else {
                        setPages(1);
                      }
                    } else {
                      setPreviewUrl(null);
                    }
                  }} 
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  {file ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-2 text-sm font-medium text-primary">
                        <CheckCircle2 className="h-4 w-4" /> {file.name}
                      </div>
                      {previewUrl && (
                        <div className="mt-2 border rounded overflow-hidden bg-background max-h-[150px] flex items-center justify-center">
                          {file.type.startsWith('image/') ? (
                            <img src={previewUrl} className="max-w-full max-h-[150px] object-contain" alt="Preview" />
                          ) : file.type === 'application/pdf' ? (
                            <div className="p-4 text-xs text-muted-foreground flex flex-col items-center gap-2">
                              <FileText className="h-8 w-8 text-primary/50" />
                              PDF Document Preview Ready
                            </div>
                          ) : (
                            <div className="p-4 text-xs text-muted-foreground">
                              {file.name} (${(file.size / 1024).toFixed(1)} KB)
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Click to upload or drag & drop</div>
                  )}
                </label>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Color Mode</Label>
                <RadioGroup value={colorMode} onValueChange={setColorMode} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bw" id="bw" />
                    <Label htmlFor="bw" className="text-xs">B&W</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="color" id="color" />
                    <Label htmlFor="color" className="text-xs">Color</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Number of Pages</Label>
                <Input 
                  type="number" 
                  min={1} 
                  value={pages} 
                  onChange={e => setPages(parseInt(e.target.value) || 1)} 
                  className="h-8 text-xs" 
                />
              </div>

              <div className="flex flex-col justify-end space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="duplex-mode" className="text-xs font-normal">Double Sided</Label>
                  <Switch id="duplex-mode" checked={duplex} onCheckedChange={setDuplex} />
                </div>
              </div>
            </div>

            <Button className="w-full" disabled={!file} onClick={handleStartScan}>
              Scan for Printers <Search className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {scanning ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <div className="text-sm font-medium animate-pulse">Searching for USB, WiFi & Bluetooth devices...</div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-md mb-2 border border-border/50">
                  <FileText className="h-4 w-4 text-primary" />
                  <div className="flex-1 text-xs font-medium truncate">{file?.name}</div>
                  <div className="text-[10px] text-muted-foreground">{(file?.size ? (file.size / 1024).toFixed(1) : 0)} KB</div>
                </div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Discovered Devices</div>
                {printers.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed rounded-lg bg-destructive/5 border-destructive/20">
                    <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-2 animate-bounce" />
                    <div className="text-lg font-black text-destructive tracking-tighter">NOT CONNECTED!!</div>
                    <p className="text-xs text-muted-foreground mt-1">No physical printers detected on this system.</p>
                    <Button variant="outline" size="sm" className="mt-4 h-8 text-xs" onClick={handleStartScan}>
                      <RefreshCw className="h-3 w-3 mr-2" /> Retry Hardware Scan
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {printers.map(p => (
                      <div 
                        key={p.id}
                        onClick={() => setSelectedPrinter(p.id)}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${selectedPrinter === p.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-primary/30'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-md bg-background border ${p.color}`}>
                            <p.icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold">{p.name}</div>
                            <div className="text-[10px] text-muted-foreground uppercase">{p.typeDisplay} Ready</div>
                          </div>
                        </div>
                        {selectedPrinter === p.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                  <Button className="flex-1" disabled={!selectedPrinter || loading} onClick={handleUpload}>
                    {loading ? "Printing..." : "Print Now"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    completed: "bg-success/10 text-success border-success/20",
    queued: "bg-primary/10 text-primary border-primary/20",
    printing: "bg-warning/10 text-warning border-warning/20",
    cancelled: "bg-muted text-muted-foreground border-border",
    failed: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium border ${variants[status] || ""}`}>
      {status}
    </span>
  );
}
