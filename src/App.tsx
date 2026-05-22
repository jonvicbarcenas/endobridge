import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useState } from 'react'
import { AppShell } from './components/AppShell'
import { AgeGate, ConsentGate } from './components/Gates'
import { SessionDraftProvider } from './context/SessionDraftContext'
import { HistoryPage } from './pages/HistoryPage'
import { LabEntryPage } from './pages/LabEntryPage'
import { QuestionnairePage } from './pages/QuestionnairePage'
import { SessionDetailPage } from './pages/SessionDetailPage'

function App() {
  const [gateResetToken, setGateResetToken] = useState(0)

  return (
    <SessionDraftProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<ConsentGate key={`consent-${gateResetToken}`} />}>
            <Route element={<AgeGate key={`age-${gateResetToken}`} />}>
              <Route element={<AppShell />}>
                <Route index element={<Navigate replace to="/lab" />} />
                <Route path="/lab" element={<LabEntryPage />} />
                <Route path="/questionnaire" element={<QuestionnairePage />} />
                <Route
                  path="/history"
                  element={
                    <HistoryPage
                      onLocalDataPurged={() => setGateResetToken((current) => current + 1)}
                    />
                  }
                />
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
