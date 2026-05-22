import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { AgeGate, ConsentGate } from './components/Gates'
import { SessionDraftProvider } from './context/SessionDraftContext'
import { HistoryPage } from './pages/HistoryPage'
import { LabEntryPage } from './pages/LabEntryPage'
import { QuestionnairePage } from './pages/QuestionnairePage'
import { SessionDetailPage } from './pages/SessionDetailPage'

function App() {
  return (
    <SessionDraftProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<ConsentGate />}>
            <Route element={<AgeGate />}>
              <Route element={<AppShell />}>
                <Route index element={<Navigate replace to="/lab" />} />
                <Route path="/lab" element={<LabEntryPage />} />
                <Route path="/questionnaire" element={<QuestionnairePage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/history/:sessionId" element={<SessionDetailPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </SessionDraftProvider>
  )
}

export default App
