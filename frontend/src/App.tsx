import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { AuthenticatedGate } from './components/Gates'
import { Panel } from './components/ui'
import { AuthProvider } from './context/AuthContext'
import { SessionDraftProvider } from './context/SessionDraftContext'
import { DailyLogsPage } from './pages/DailyLogsPage'
import { DashboardPage } from './pages/DashboardPage'
import { GlossaryPage } from './pages/GlossaryPage'
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
                <Route path="/glossary" element={<GlossaryPage />} />
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
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel className="lg:col-span-2" eyebrow="Purpose" title="Personal PCOS monitoring companion">
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          EndoBridge helps you organize PCOS-related lab values, symptoms, medication reminders,
          daily wellness logs, uploaded lab result files, and observational reports over time, so you
          can bring a clear record to your clinician.
        </p>
      </Panel>

      <Panel eyebrow="What it offers" title="Features">
        <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
          <li><span className="font-medium text-slate-900">Lab sessions:</span> enter ten common lab values, or upload a PDF or photo of your report to fill them in automatically.</li>
          <li><span className="font-medium text-slate-900">Contextual questionnaire:</span> cycle, skin, hair, and daily-context questions chosen from a fixed question bank.</li>
          <li><span className="font-medium text-slate-900">Daily logs:</span> sleep, mood, stress, cycle events, and symptoms, with a weekly summary on the Dashboard.</li>
          <li><span className="font-medium text-slate-900">Medication reminders:</span> reminders for medicines already prescribed to you, with a 7-day calendar.</li>
          <li><span className="font-medium text-slate-900">Reports:</span> plain-language observations about the data you entered.</li>
          <li><span className="font-medium text-slate-900">Glossary:</span> plain meanings of lab tests, units, and symptom words.</li>
        </ul>
      </Panel>

      <Panel eyebrow="Limitations" title="What EndoBridge cannot do">
        <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
          <li>It does not diagnose PCOS or any other condition.</li>
          <li>It does not prescribe medicine, check medication safety, or change doses.</li>
          <li>It does not give treatment, diet, or exercise advice.</li>
          <li>Range flags use general reference ranges; your lab&apos;s ranges may differ. Hormone and thyroid values are left for clinician review.</li>
          <li>Scanning a report can misread values. Always check extracted values against the original.</li>
          <li>Reminder alerts only appear while EndoBridge is open in a browser tab, and depend on your browser and device settings.</li>
        </ul>
      </Panel>

      <Panel eyebrow="Safety and privacy" title="How your information is handled">
        <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
          <li>Records are stored in your EndoBridge account and are not sold or shared publicly.</li>
          <li>Passwords and recovery codes are stored only as one-way hashes.</li>
          <li>When a report is generated, medication names, doses, and schedules are removed before anything is sent to the AI model.</li>
          <li>Unsaved form drafts are kept only in the current browser tab and are cleared when you log out.</li>
          <li>You can ask the administrators to correct or remove your information at any time.</li>
        </ul>
      </Panel>

      <Panel eyebrow="When to get care" title="This is not an emergency service">
        <p className="text-sm leading-6 text-slate-600">
          If you have severe pain, very heavy bleeding, fainting, or any symptom that worries you,
          contact a healthcare professional or local emergency services. Do not wait for an app.
        </p>
      </Panel>
    </div>
  )
}
