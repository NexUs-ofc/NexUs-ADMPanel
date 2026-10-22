import { lazy, Suspense } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { InfoBanner, PageSkeleton } from '../components/ui'
import { getService, isConfigured, SERVICES } from '../config'

// As páginas carregam sob demanda: o login abre sem baixar a biblioteca de gráficos.
const SpringServicePage = lazy(() => import('./SpringServicePage').then((m) => ({ default: m.SpringServicePage })))
const IaServicePage = lazy(() => import('./IaServicePage').then((m) => ({ default: m.IaServicePage })))

const VARIAVEL: Record<string, string> = {
  notify: 'VITE_NOTIFY_API_URL',
  auth: 'VITE_AUTH_API_URL',
  core: 'VITE_CORE_API_URL',
  ia: 'VITE_IA_API_URL',
  'bi-ia': 'VITE_BI_IA_API_URL',
}

export function ServicePage() {
  const { serviceId } = useParams()
  const service = getService(serviceId)

  if (!service) {
    return <Navigate to={`/${SERVICES[0].id}`} replace />
  }

  if (!isConfigured(service)) {
    return (
      <>
        <h1 className="pagina__titulo">{service.label}</h1>
        <InfoBanner titulo="Serviço não configurado">
          Defina <code>{VARIAVEL[service.id]}</code> no <code>.env.local</code> com o endereço do serviço e recarregue o
          painel.
        </InfoBanner>
      </>
    )
  }

  // key: trocar de serviço remonta a página e zera janela, dados e relatório do anterior.
  return (
    <Suspense fallback={<PageSkeleton />}>
      {service.kind === 'spring' ? (
        <SpringServicePage key={service.id} service={service} />
      ) : (
        <IaServicePage key={service.id} service={service} />
      )}
    </Suspense>
  )
}
