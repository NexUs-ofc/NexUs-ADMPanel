import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { SessionProvider, useSession } from './auth/session'
import { Layout } from './components/Layout'
import { SERVICES } from './config'
import { LoginPage } from './pages/LoginPage'
import { ServicePage } from './pages/ServicePage'

/** Sem chave na sessão, manda para o login lembrando de onde veio. */
function Protegido({ children }: { children: ReactNode }) {
  const { adminKey } = useSession()
  const location = useLocation()
  if (!adminKey) {
    return <Navigate to="/login" replace state={{ de: location.pathname }} />
  }
  return children
}

export function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <Protegido>
                <Layout />
              </Protegido>
            }
          >
            <Route index element={<Navigate to={`/${SERVICES[0].id}`} replace />} />
            <Route path=":serviceId" element={<ServicePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  )
}
