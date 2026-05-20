import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import FundExplorer from "@/pages/FundExplorer";
import FundDetail from "@/pages/FundDetail";
import SIPs from "@/pages/SIPs";
import Transactions from "@/pages/Transactions";
import Calculators from "@/pages/Calculators";
import Watchlist from "@/pages/Watchlist";
import KYC from "@/pages/KYC";
import Profile from "@/pages/Profile";
import Goals from "@/pages/Goals";
import TaxCenter from "@/pages/TaxCenter";
import Reports from "@/pages/Reports";
import Insights from "@/pages/Insights";
import Compare from "@/pages/Compare";
import Notifications from "@/pages/Notifications";
import Referrals from "@/pages/Referrals";
import Advisor from "@/pages/Advisor";
import Install from "@/pages/Install";
import AdminLayout from "@/components/AdminLayout";
import AdminOverview from "@/pages/admin/AdminOverview";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminUserDetail from "@/pages/admin/AdminUserDetail";
import AdminFunds from "@/pages/admin/AdminFunds";
import AdminTransactions from "@/pages/admin/AdminTransactions";
import AdminKYC from "@/pages/admin/AdminKYC";
import AdminBroadcast from "@/pages/admin/AdminBroadcast";
import AdminAudit from "@/pages/admin/AdminAudit";
import AdminEarnings from "@/pages/admin/AdminEarnings";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            duration={3000}
            toastOptions={{
              style: {
                background: "#FFFFFF",
                border: "1px solid #E6ECF3",
                color: "#0F2A5C",
                fontFamily: "Inter, sans-serif",
              },
            }}
          />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/advisor" element={<Advisor />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/funds" element={<FundExplorer />} />
              <Route path="/funds/:id" element={<FundDetail />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/watchlist" element={<Watchlist />} />
              <Route path="/sips" element={<SIPs />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/calculators" element={<Calculators />} />
              <Route path="/tax" element={<TaxCenter />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/kyc" element={<KYC />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/referrals" element={<Referrals />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/install" element={<Install />} />
            </Route>

            {/* Admin routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminOverview />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="users/:id" element={<AdminUserDetail />} />
              <Route path="funds" element={<AdminFunds />} />
              <Route path="transactions" element={<AdminTransactions />} />
              <Route path="kyc" element={<AdminKYC />} />
              <Route path="broadcast" element={<AdminBroadcast />} />
              <Route path="audit" element={<AdminAudit />} />
              <Route path="earnings" element={<AdminEarnings />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
