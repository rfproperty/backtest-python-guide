import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Layout from "@/components/ui/Layout";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import type { User } from "./types";
import { ADMIN_EMAIL } from "./config";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import SubmitBacktestPage from "./pages/SubmitBacktestPage";
import PricingPage from "./pages/PricingPage";
import AccountPage from "./pages/AccountPage";
import CheckoutSuccessPage from "./pages/CheckoutSuccessPage";
import CheckoutCancelPage from "./pages/CheckoutCancelPage";
import ContactPage from "./pages/ContactPage";
import OAuthGooglePage from "./pages/OAuthGooglePage";
import BacktestReviewPage from "./pages/BacktestReviewPage";
import AdminTrainAIPage from "./pages/AdminTrainAIPage";

const STORAGE_KEY = "backtestai:user";
const queryClient = new QueryClient();

type AuthSuccess = (user: User) => void;

function App() {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as User;
    } catch (error) {
      console.warn("Failed to parse stored user", error);
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const handleAuthSuccess = useCallback<AuthSuccess>((authUser) => {
    setUser(authUser);
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
  }, []);

  const handleUserUpdate = useCallback((nextUser: User | null) => {
    setUser(nextUser);
  }, []);

  const isAdmin = useMemo(
    () => (user ? user.email.toLowerCase() === ADMIN_EMAIL : false),
    [user],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" />
        <BrowserRouter>
          <Layout user={user} onLogout={handleLogout}>
            <Routes>
              <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <HomePage user={user} />} />
              <Route
                path="/login"
                element={user ? <Navigate to="/" replace /> : <LoginPage onSuccess={handleAuthSuccess} />}
              />
              <Route
                path="/signup"
                element={user ? <Navigate to="/" replace /> : <SignupPage onSuccess={handleAuthSuccess} />}
              />
              <Route
                path="/dashboard"
                element={user ? <DashboardPage user={user} /> : <Navigate to="/login" replace />}
              />
              <Route path="/pricing" element={<PricingPage user={user} />} />
              <Route
                path="/account"
                element={
                  user ? <AccountPage user={user} onUserUpdate={handleUserUpdate} /> : <Navigate to="/login" replace />
                }
              />
              <Route
                path="/submit_backtest"
                element={user ? <SubmitBacktestPage user={user} /> : <Navigate to="/login" replace />}
              />
              <Route
                path="/backtests/:backtestId"
                element={user ? <BacktestReviewPage user={user} /> : <Navigate to="/login" replace />}
              />
              <Route path="/contact" element={<ContactPage user={user} />} />
              <Route
                path="/checkout_success"
                element={
                  user ? <CheckoutSuccessPage user={user} onUserUpdate={handleUserUpdate} /> : <Navigate to="/login" replace />
                }
              />
              <Route path="/checkout_cancel" element={<CheckoutCancelPage />} />
              <Route path="/oauth/google" element={<OAuthGooglePage onSuccess={handleAuthSuccess} />} />
              <Route
                path="/admin/train_ai"
                element={
                  user && isAdmin ? (
                    <AdminTrainAIPage user={user} />
                  ) : (
                    <Navigate to={user ? "/dashboard" : "/login"} replace />
                  )
                }
              />
              <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
