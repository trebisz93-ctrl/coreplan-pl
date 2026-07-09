import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { AuthProvider } from "./context/AuthContext";
import { OrganizationProvider } from "./context/OrganizationContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SuperAdminRoute } from "./components/SuperAdminRoute";
import { AppLayout } from "./components/AppLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { CookieConsent } from "./components/CookieConsent";

// Lazy-loaded route components
const SuperAdminLayout = lazy(() => import("./components/admin/SuperAdminLayout").then(m => ({ default: m.SuperAdminLayout })));
const SuperAdminDashboard = lazy(() => import("./components/admin/SuperAdminDashboard").then(m => ({ default: m.SuperAdminDashboard })));
const OrganizationsView = lazy(() => import("./components/admin/OrganizationsView").then(m => ({ default: m.OrganizationsView })));
const GlobalUsersView = lazy(() => import("./components/admin/GlobalUsersView").then(m => ({ default: m.GlobalUsersView })));
const SystemLogsView = lazy(() => import("./components/admin/SystemLogsView").then(m => ({ default: m.SystemLogsView })));
const ActivityMonitoringView = lazy(() => import("./components/admin/ActivityMonitoringView").then(m => ({ default: m.ActivityMonitoringView })));
const TrashView = lazy(() => import("./components/admin/TrashView").then(m => ({ default: m.TrashView })));
const SecurityView = lazy(() => import("./components/admin/SecurityView").then(m => ({ default: m.SecurityView })));
const AdminBackupsView = lazy(() => import("./components/admin/AdminBackupsView").then(m => ({ default: m.AdminBackupsView })));
const AdminReportsView = lazy(() => import("./components/admin/AdminReportsView").then(m => ({ default: m.AdminReportsView })));
const GlobalClientsView = lazy(() => import("./components/admin/GlobalClientsView").then(m => ({ default: m.GlobalClientsView })));
const RolesManagementView = lazy(() => import("./components/admin/RolesManagementView").then(m => ({ default: m.RolesManagementView })));
const IntegrationsView = lazy(() => import("./components/admin/IntegrationsView").then(m => ({ default: m.IntegrationsView })));
const EmailLogView = lazy(() => import("./components/admin/EmailLogView").then(m => ({ default: m.EmailLogView })));
const YearView = lazy(() => import("./components/YearView").then(m => ({ default: m.YearView })));
const DashboardView = lazy(() => import("./components/DashboardView").then(m => ({ default: m.DashboardView })));

const ReportsView = lazy(() => import("./components/ReportsView").then(m => ({ default: m.ReportsView })));
const ClientsView = lazy(() => import("./components/ClientsView").then(m => ({ default: m.ClientsView })));
const ProductsView = lazy(() => import("./components/ProductsView").then(m => ({ default: m.ProductsView })));
const SettingsView = lazy(() => import("./components/SettingsView").then(m => ({ default: m.SettingsView })));
const UsersView = lazy(() => import("./components/UsersView").then(m => ({ default: m.UsersView })));
const ImportExportView = lazy(() => import("./components/ImportExportView").then(m => ({ default: m.ImportExportView })));
const SalesEstimationsView = lazy(() => import("./components/SalesEstimationsView").then(m => ({ default: m.SalesEstimationsView })));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Terms = lazy(() => import("./pages/Terms"));

const LazyFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,      // 2 min — data considered fresh
      gcTime: 10 * 60 * 1000,         // 10 min garbage collection
      refetchOnWindowFocus: false,     // don't refetch on tab switch
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ErrorBoundary>
          <AuthProvider>
          <OrganizationProvider>
            <Suspense fallback={<LazyFallback />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
                <Route path="/polityka-prywatnosci" element={<PrivacyPolicy />} />
                <Route path="/regulamin" element={<Terms />} />
                {/* Super Admin routes */}
                <Route element={<SuperAdminRoute><SuperAdminLayout /></SuperAdminRoute>}>
                  <Route path="/admin" element={<SuperAdminDashboard />} />
                  <Route path="/admin/organizations" element={<OrganizationsView />} />
                  <Route path="/admin/users" element={<GlobalUsersView />} />
                  <Route path="/admin/activity" element={<ActivityMonitoringView />} />
                  <Route path="/admin/logs" element={<SystemLogsView />} />
                  <Route path="/admin/trash" element={<TrashView />} />
                  <Route path="/admin/backups" element={<AdminBackupsView />} />
                  <Route path="/admin/reports" element={<AdminReportsView />} />
                  <Route path="/admin/clients" element={<GlobalClientsView />} />
                  <Route path="/admin/roles" element={<RolesManagementView />} />
                  <Route path="/admin/security" element={<SecurityView />} />
                  <Route path="/admin/integrations" element={<IntegrationsView />} />
                  <Route path="/admin/emails" element={<EmailLogView />} />
                  <Route path="/admin/settings" element={<SettingsView />} />
                </Route>
                {/* Org-scoped routes */}
                <Route element={<ProtectedRoute><AppProvider><AppLayout /></AppProvider></ProtectedRoute>}>
                  <Route path="/app" element={<YearView />} />
                  <Route path="/dashboard" element={<DashboardView />} />
                  <Route path="/clients" element={<ClientsView />} />
                  <Route path="/products" element={<ProductsView />} />
                  
                  <Route path="/reports" element={<ReportsView />} />
                  <Route path="/import-export" element={<ImportExportView />} />
                  <Route path="/estimations" element={<SalesEstimationsView />} />
                  <Route path="/users" element={<UsersView />} />
                  <Route path="/settings" element={<SettingsView />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <CookieConsent />
          </OrganizationProvider>
          </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
