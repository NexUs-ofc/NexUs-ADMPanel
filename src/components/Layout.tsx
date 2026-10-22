import { useState, type ComponentType } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useSession } from '../auth/session'
import { DEMO_MODE, isConfigured, SERVICES, type ServiceId } from '../config'
import {
  BarChartIcon,
  BellIcon,
  GlobeIcon,
  LogoIcon,
  LogOutIcon,
  MenuIcon,
  SparklesIcon,
  UserCheckIcon,
} from './icons'

const ICONES: Record<ServiceId, ComponentType<{ size?: number }>> = {
  notify: BellIcon,
  auth: UserCheckIcon,
  core: GlobeIcon,
  ia: SparklesIcon,
  'bi-ia': BarChartIcon,
}

/**
 * Menu lateral fixo na altura da tela: só o conteúdo rola. Em tela estreita, o menu vira gaveta
 * aberta pelo botão do topo.
 */
export function Layout() {
  const { logout } = useSession()
  const [aberto, setAberto] = useState(false)
  const { pathname } = useLocation()
  const [rotaDoMenu, setRotaDoMenu] = useState(pathname)

  // Fecha a gaveta ao navegar, sem efeito: compara a rota atual com a da última renderização.
  if (rotaDoMenu !== pathname) {
    setRotaDoMenu(pathname)
    setAberto(false)
  }

  return (
    <div className="estrutura">
      <nav className={`menu${aberto ? ' menu--aberto' : ''}`} aria-label="Serviços">
        <div className="menu__marca">
          <span className="menu__logo">
            <LogoIcon size={18} />
          </span>
          Painel ADM
        </div>
        <ul className="menu__lista">
          {SERVICES.map((service) => {
            const Icone = ICONES[service.id]
            const configurado = isConfigured(service)
            return (
              <li key={service.id}>
                <NavLink
                  to={`/${service.id}`}
                  className={({ isActive }) =>
                    `menu__item${isActive ? ' menu__item--ativo' : ''}${configurado ? '' : ' menu__item--off'}`
                  }
                >
                  <Icone size={18} />
                  {service.label}
                  {!configurado && <span className="menu__nota">off</span>}
                </NavLink>
              </li>
            )
          })}
        </ul>
        <button type="button" className="menu__sair" onClick={() => logout()}>
          <LogOutIcon size={18} />
          Sair do Portal
        </button>
      </nav>

      <div className="principal">
        <header className="topo">
          <button
            type="button"
            className="topo__menu"
            aria-label="Abrir menu"
            aria-expanded={aberto}
            onClick={() => setAberto((valor) => !valor)}
          >
            <MenuIcon size={22} />
          </button>
          <span className="topo__titulo">Painel de Controle</span>
          {DEMO_MODE && <span className="chip">Modo demonstração</span>}
        </header>
        <main className="conteudo">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
