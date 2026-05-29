import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { AuthenticatedGate } from './components/Gates'
import { Panel } from './components/ui'
import { AuthProvider } from './context/AuthContext'
import { SessionDraftProvider } from './context/SessionDraftContext'
import { DailyLogsPage } from './pages/DailyLogsPage'
import { DashboardPage } from './pages/DashboardPage'
import { HistoryPage } from './pages/HistoryPage'
import { LabEntryPage } from './pages/LabEntryPage'
import { MedicationsPage } from './pages/MedicationsPage'
import { QuestionnairePage } from './pages/QuestionnairePage'
import { SessionDetailPage } from './pages/SessionDetailPage'
import { SymptomsPage } from './pages/SymptomsPage'

function App() {
  return (
    <AuthProvider>
      <SessionDraftProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AuthenticatedGate />}>
              <Route element={<AppShell />}>
                <Route index element={<Navigate replace to="/dashboard" />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/lab" element={<LabEntryPage />} />
                <Route path="/daily" element={<DailyLogsPage />} />
                <Route path="/symptoms" element={<SymptomsPage />} />
                <Route path="/medications" element={<MedicationsPage />} />
                <Route path="/questionnaire" element={<QuestionnairePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/history/:sessionId" element={<SessionDetailPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </SessionDraftProvider>
    </AuthProvider>
  )
}

export default App

function AboutPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Panel eyebrow="Purpose" title="Personal PCOS monitoring companion">
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          EndoBridge helps users organize PCOS-related lab values, symptoms, medication
          reminders, daily wellness logs, uploaded lab result files, and observational insight reports over
          time. It is designed for personal monitoring and account-backed record keeping.
        </p>
      </Panel>
      <Panel eyebrow="Boundaries" title="Clinical safety scope">
        <p className="text-sm leading-6 text-slate-600">
          EndoBridge does not diagnose PCOS, prescribe medicine, validate medication safety,
          adjust dosage, or provide treatment, diet, or exercise advice.
        </p>
      </Panel>
    </div>
  )
}
