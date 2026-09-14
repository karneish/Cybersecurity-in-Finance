import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useNotificationStore } from '@/store/notificationStore'
import { useToastStore } from '@/store/toastStore'
import { useRiskStore } from '@/store/riskStore'
import { useWebSocket, type WSMessage } from '@/hooks/useWebSocket'
import { hasAccess, getDefaultRoute, PAGE_ACCESS } from '@/config/roles'
import MainLayout from '@/components/layout/MainLayout'
import Toaster from '@/components/common/Toaster'
import LoginPage from '@/pages/LoginPage'
import ExecutiveDashboard from '@/pages/ExecutiveDashboard'
import SecurityDashboard from '@/pages/SecurityDashboard'
import RiskAnalysis from '@/pages/RiskAnalysis'
import AssetManagement from '@/pages/AssetManagement'
import VulnerabilityManagement from '@/pages/VulnerabilityManagement'
import ScenarioSimulator from '@/pages/ScenarioSimulator'
import InvestmentOptimizer from '@/pages/InvestmentOptimizer'
import NationalObservatory from '@/pages/NationalObservatory'
import AIAssistant from '@/pages/AIAssistant'
import Settings from '@/pages/Settings'
import LoadingSpinner from '@/components/common/LoadingSpinner'

type RiskUpdate = {
  assetId?: string
  assetName?: string
  message?: string
  delta?: number
  currentRisk?: number
  previousRisk?: number
}

function pageFor(path: string) {
  return PAGE_ACCESS.find((p) => p.path === path) ?? PAGE_ACCESS[0]
}

function handleLiveMessage(msg: WSMessage) {
  const notifications = useNotificationStore.getState()
  const toasts = useToastStore.getState()
  const risk = useRiskStore.getState()

  if (msg.type === 'risk:updated') {
    const p = msg.payload as RiskUpdate
    const title = p.assetName || p.assetId || 'asset'
    const delta = typeof p.delta === 'number' ? p.delta : 0
    const message =
      p.message || `Risk changed by ₹${delta.toLocaleString('en-IN')} for ${title}`
    notifications.addNotification(delta > 0 ? 'warning' : 'success', message)
    toasts.addToast(delta > 0 ? 'warning' : 'success', message)
    risk.fetchRiskScore()
    risk.fetchEAL()
    risk.fetchTrends()
  } else if (msg.type === 'ingestion:event') {
    const message = 'New security event ingested'
    notifications.addNotification('info', message)
    toasts.addToast('info', message)
  }
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuthStore()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RoleGuard({
  children,
  page,
}: {
  children: React.ReactNode
  page: (typeof PAGE_ACCESS)[number]
}) {
  const { user } = useAuthStore()
  if (!user || !hasAccess(user.role, page.minRole)) {
    return <Navigate to={getDefaultRoute(user?.role ?? 'VIEWER')} replace />
  }
  return <>{children}</>
}

function AppContent() {
  const { initialize, loading } = useAuthStore()

  useWebSocket(handleLiveMessage)

  useEffect(() => {
    initialize()
  }, [initialize])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ExecutiveDashboard />} />
          <Route path="security" element={<RoleGuard page={pageFor('/security')}><SecurityDashboard /></RoleGuard>} />
          <Route path="risk" element={<RoleGuard page={pageFor('/risk')}><RiskAnalysis /></RoleGuard>} />
          <Route path="assets" element={<RoleGuard page={pageFor('/assets')}><AssetManagement /></RoleGuard>} />
          <Route path="vulnerabilities" element={<RoleGuard page={pageFor('/vulnerabilities')}><VulnerabilityManagement /></RoleGuard>} />
          <Route path="simulator" element={<RoleGuard page={pageFor('/simulator')}><ScenarioSimulator /></RoleGuard>} />
          <Route path="investment" element={<RoleGuard page={pageFor('/investment')}><InvestmentOptimizer /></RoleGuard>} />
          <Route path="national" element={<RoleGuard page={pageFor('/national')}><NationalObservatory /></RoleGuard>} />
          <Route path="ai" element={<RoleGuard page={pageFor('/ai')}><AIAssistant /></RoleGuard>} />
          <Route path="settings" element={<RoleGuard page={pageFor('/settings')}><Settings /></RoleGuard>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppContent />
    </BrowserRouter>
  )
}
