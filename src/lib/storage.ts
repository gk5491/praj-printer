import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  employee_id: string;
  name: string;
  email?: string;
  department: string;
  pin: string;
  role: 'admin' | 'employee';
  status?: 'active' | 'inactive';
  monthlyQuota?: number;
  usedPages?: number;
  authMethod?: string;
  totalCost?: number;
  lastPrint?: string;
}

export interface PrintJob {
  id: string;
  user_id: string;
  userName: string;
  document_name: string;
  pages: number;
  copies: number;
  color_mode: 'bw' | 'color';
  duplex: boolean;
  status: 'pending' | 'completed' | 'cancelled' | 'failed';
  submitted_at: string;
  released_at?: string;
  cost: number;
  department: string;
  printer_name?: string;
}

export interface Printer {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'warning' | 'error';
  type: 'color' | 'bw';
  tonerLevel: number;
  paperLevel: number;
  jobCount: number;
  ip?: string;
  model?: string;
  totalPrints?: number;
  lastMaintenance?: string;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

const getStoredData = <T>(key: string, initial: T): T => {
  const stored = localStorage.getItem(key);
  try {
    return stored ? JSON.parse(stored) : initial;
  } catch (e) {
    return initial;
  }
};

const setStoredData = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const storage = {
  // Users
  getUsers: () => getStoredData<User[]>('users', []),
  setUsers: (users: User[]) => setStoredData('users', users),
  
  // Printers
  getPrinters: () => getStoredData<Printer[]>('printers', []),
  setPrinters: (printers: Printer[]) => setStoredData('printers', printers),

  // Policies
  getPolicies: () => getStoredData<Policy[]>('policies', [
    { id: 'pol1', name: 'Enforce B&W', description: 'Default all jobs to B&W', enabled: true },
    { id: 'pol2', name: 'Duplex Only', description: 'Enforce double-sided printing', enabled: false },
  ]),

  // Jobs
  getJobs: () => getStoredData<PrintJob[]>('print_jobs', []),
  
  addJob: (jobData: Partial<PrintJob>) => {
    const jobs = storage.getJobs();
    const users = storage.getUsers();
    const user = users.find(u => u.id === jobData.user_id);
    
    const newJob: PrintJob = {
      id: uuidv4(),
      user_id: jobData.user_id || 'u1',
      userName: user?.name || 'Admin User',
      department: user?.department || 'IT',
      document_name: jobData.document_name || 'Untitled',
      pages: jobData.pages || 1,
      copies: jobData.copies || 1,
      color_mode: jobData.color_mode || 'bw',
      duplex: jobData.duplex || false,
      status: 'pending',
      submitted_at: new Date().toISOString(),
      cost: (jobData.pages || 1) * (jobData.color_mode === 'color' ? 0.50 : 0.10),
      ...jobData
    } as PrintJob;
    
    setStoredData('print_jobs', [newJob, ...jobs]);

    // Update printer stats if job is completed
    if (newJob.status === 'completed' && newJob.printer_name) {
      const printers = storage.getPrinters();
      const updatedPrinters = printers.map(p => {
        if (p.name === newJob.printer_name) {
          return {
            ...p,
            jobCount: (p.jobCount || 0) + 1,
            totalPrints: (p.totalPrints || 0) + newJob.pages,
          };
        }
        return p;
      });
      storage.setPrinters(updatedPrinters);
    }

    return newJob;
  },

  releaseJob: (jobId: string, pin: string) => {
    const jobs = storage.getJobs();
    const users = storage.getUsers();
    const job = jobs.find(j => j.id === jobId);
    
    if (!job) throw new Error('Job not found');
    
    const user = users.find(u => u.id === job.user_id && u.pin === pin);
    if (users.length > 0 && !user) throw new Error('Invalid PIN');
    
    const updatedJobs = jobs.map(j => 
      j.id === jobId 
        ? { ...j, status: 'completed' as const, released_at: new Date().toISOString() } 
        : j
    );
    
    setStoredData('print_jobs', updatedJobs);
    return true;
  },

  // Stats for Dashboard
  getStats: () => {
    const jobs = storage.getJobs();
    const printers = storage.getPrinters();
    const completedJobs = jobs.filter(j => j.status === 'completed');
    
    const today = new Date().toISOString().split('T')[0];
    const jobsToday = jobs.filter(j => j.submitted_at.startsWith(today));

    const totalCost = completedJobs.reduce((sum, j) => sum + j.cost, 0);
    const totalPages = completedJobs.reduce((sum, j) => sum + j.pages, 0);
    const colorPages = completedJobs.filter(j => j.color_mode === 'color').reduce((sum, j) => sum + j.pages, 0);
    const bwPages = totalPages - colorPages;

    // Cost by department
    const deptStats: Record<string, number> = {};
    completedJobs.forEach(j => {
      deptStats[j.department] = (deptStats[j.department] || 0) + j.cost;
    });

    // Group volume by last 7 days
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const printVolumeData = last7Days.map(date => {
      const dayJobs = completedJobs.filter(j => j.submitted_at.startsWith(date));
      return {
        date: date.split('-').slice(1).join('/'),
        value: dayJobs.reduce((sum, j) => sum + j.pages, 0),
        bw: dayJobs.filter(j => j.color_mode === 'bw').reduce((sum, j) => sum + j.pages, 0),
        color: dayJobs.filter(j => j.color_mode === 'color').reduce((sum, j) => sum + j.pages, 0),
      };
    });

    return {
      kpis: {
        totalPrintsToday: jobsToday.length,
        activePrinters: printers.filter(p => p.status === 'online').length,
        totalPrinters: printers.length,
        costThisMonth: totalCost,
        paperSavedDuplex: completedJobs.filter(j => j.duplex).reduce((sum, j) => sum + j.pages, 0),
        pendingJobs: jobs.filter(j => j.status === 'pending').length,
      },
      departmentCostData: Object.entries(deptStats).map(([department, cost]) => ({ department, cost })),
      colorRatioData: [
        { name: 'B&W', value: bwPages, fill: 'hsl(var(--primary))' },
        { name: 'Color', value: colorPages, fill: 'hsl(var(--warning))' },
      ],
      printVolumeData
    };
  }
};

// Auto-seed admin user if none exists
if (storage.getUsers().length === 0) {
  storage.setUsers([
    { 
      id: 'u1', employee_id: 'EMP001', name: 'Admin User', department: 'IT', pin: '1234', role: 'admin',
      email: 'admin@company.com', status: 'active', monthlyQuota: 500, usedPages: 120, 
      authMethod: 'SSO', totalCost: 25.50, lastPrint: new Date().toISOString() 
    },
    { 
      id: 'u2', employee_id: 'EMP002', name: 'John Doe', department: 'Engineering', pin: '1111', role: 'employee',
      email: 'john@company.com', status: 'active', monthlyQuota: 300, usedPages: 245, 
      authMethod: 'PIN', totalCost: 48.20, lastPrint: new Date().toISOString() 
    },
  ]);
}

// Auto-seed initial jobs if none exist
if (storage.getJobs().length === 0) {
  storage.addJob({
    user_id: 'u2', // Mapping EMP002 to the seeded user u2
    userName: 'John Doe',
    document_name: 'Report.pdf',
    submitted_at: '2026-04-22T11:00:00Z',
    printer_name: 'Canon LBP2900',
    pages: 5,
    status: 'completed',
    cost: 0.50
  });
}

// FORCE CLEAR STALE MOCK PRINTERS (One-time cleanup)
const existingPrinters = storage.getPrinters();
if (existingPrinters.some(p => p.id === 'p1' || p.id === 'p2' || p.id === 'usb-1')) {
  storage.setPrinters([]);
}
