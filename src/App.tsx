import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Auth pages
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// Client pages
import ClientDashboard from "./pages/client/Dashboard";
import ClientTickets from "./pages/client/Tickets";
import ClientProducts from "./pages/client/Products";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminClients from "./pages/admin/Clients";
import AdminUsers from "./pages/admin/Users";
import AdminContracts from "./pages/admin/Contracts";
import AdminTickets from "./pages/admin/Tickets";
import AdminProducts from "./pages/admin/Products";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { isAdmin, isLoading } = useAuth();

  if (isLoading) return null;

  return (
    <Routes>
      {/* Auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Client routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          {isAdmin ? <AdminDashboard /> : <ClientDashboard />}
        </ProtectedRoute>
      } />
      <Route path="/tickets" element={
        <ProtectedRoute>
          <ClientTickets />
        </ProtectedRoute>
      } />
      <Route path="/products" element={
        <ProtectedRoute>
          <ClientProducts />
        </ProtectedRoute>
      } />

      {/* Admin routes */}
      <Route path="/admin/dashboard" element={
        <ProtectedRoute requireAdmin>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin/clients" element={
        <ProtectedRoute requireAdmin>
          <AdminClients />
        </ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute requireAdmin>
          <AdminUsers />
        </ProtectedRoute>
      } />
      <Route path="/admin/contracts" element={
        <ProtectedRoute requireAdmin>
          <AdminContracts />
        </ProtectedRoute>
      } />
      <Route path="/admin/tickets" element={
        <ProtectedRoute requireAdmin>
          <AdminTickets />
        </ProtectedRoute>
      } />
      <Route path="/admin/products" element={
        <ProtectedRoute requireAdmin>
          <AdminProducts />
        </ProtectedRoute>
      } />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
