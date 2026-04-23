import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleProvider } from "@/contexts/RoleContext";
import { Layout } from "@/components/Layout";
import Dashboard from "./pages/Dashboard";
import QuickPrint from "./pages/QuickPrint";
import Printers from "./pages/Printers";
import PrintJobs from "./pages/PrintJobs";
import Users from "./pages/Users";
import CostControl from "./pages/CostControl";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import ReleaseJobs from "./pages/ReleaseJobs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RoleProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/quick-print" element={<QuickPrint />} />
              <Route path="/printers" element={<Printers />} />
              <Route path="/print-jobs" element={<PrintJobs />} />
              <Route path="/users" element={<Users />} />
              <Route path="/cost-control" element={<CostControl />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/release" element={<ReleaseJobs />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </RoleProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
