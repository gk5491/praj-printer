import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, Lock, Send, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { storage } from "@/lib/storage";

export default function ReleaseJobs() {
  const [employeeId, setEmployeeId] = useState("");
  const [pin, setPin] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = storage.getUsers().find(u => u.employee_id === employeeId);
      if (!user) throw new Error("User not found");
      
      const allJobs = storage.getJobs();
      setJobs(allJobs.filter((j: any) => j.user_id === user.id && j.status === 'pending'));
      setAuthenticated(true);
      toast.success("Identity verified");
    } catch (error) {
      toast.error("Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = (jobId: string) => {
    try {
      storage.releaseJob(jobId, pin);
      toast.success("Job released to printer!");
      setJobs(prev => prev.filter(j => j.id !== jobId));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md shadow-lg border-2 border-primary/10">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Secure Print Release</CardTitle>
            <p className="text-sm text-muted-foreground">Enter your credentials to release pending jobs</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium">Employee ID</label>
                <Input 
                  placeholder="e.g. EMP001" 
                  value={employeeId} 
                  onChange={e => setEmployeeId(e.target.value)}
                  required 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">PIN</label>
                <Input 
                  type="password" 
                  placeholder="****" 
                  value={pin} 
                  onChange={e => setPin(e.target.value)}
                  required 
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : "Identify"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Your Pending Jobs</h1>
          <p className="text-sm text-muted-foreground">Select a job to release it to the nearest printer</p>
        </div>
        <Button variant="outline" onClick={() => setAuthenticated(false)}>Log Out</Button>
      </div>

      {jobs.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Printer className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-medium">No pending jobs found</h3>
          <p className="text-sm text-muted-foreground">Jobs you submit via the portal will appear here.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {jobs.map(job => (
            <Card key={job.id} className="overflow-hidden hover:border-primary/50 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/5 p-3 rounded-lg">
                    <Printer className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{job.document_name}</h3>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>{job.pages} pages</span>
                      <span>•</span>
                      <span className="uppercase">{job.color_mode}</span>
                      <span>•</span>
                      <span>Submitted {new Date(job.submitted_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right mr-4">
                    <div className="text-sm font-bold text-primary">${job.cost.toFixed(2)}</div>
                    <div className="text-[10px] text-muted-foreground">Estimate</div>
                  </div>
                  <Button onClick={() => handleRelease(job.id)} size="lg" className="px-8 shadow-md">
                    <Send className="h-4 w-4 mr-2" /> Print Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
