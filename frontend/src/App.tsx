import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { ProtectedLayout } from './ProtectedLayout'
import { DependenciesGraphPage } from './pages/DependenciesGraphPage'
import { AdminPage } from './pages/AdminPage'
import { BoardPage } from './pages/BoardPage'
import { ChangePasswordPage, LoginPage } from './pages/AuthPages'
import { DashboardPage } from './pages/DashboardPage'
import { AppShellLayout } from './AppShellLayout'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route element={<ProtectedLayout />}>
            <Route element={<AppShellLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/" element={<BoardPage />} />
              <Route path="/dependencies" element={<DependenciesGraphPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
