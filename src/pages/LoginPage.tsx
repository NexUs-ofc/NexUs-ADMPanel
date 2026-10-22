import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSession } from '../auth/session'
import { EyeIcon, EyeOffIcon } from '../components/icons'
import { DEMO_MODE } from '../config'

/** Losangos de contorno no canto da tela, como no desenho. */
function Losangos() {
  const formas = [
    { x: 760, y: 70, l: 70, e: 9 },
    { x: 560, y: 210, l: 45, e: 1.5 },
    { x: 690, y: 250, l: 130, e: 1.5 },
    { x: 650, y: 440, l: 200, e: 9 },
    { x: 520, y: 420, l: 120, e: 1.5 },
    { x: 380, y: 420, l: 60, e: 9 },
    { x: 580, y: 590, l: 180, e: 9 },
    { x: 230, y: 560, l: 70, e: 9 },
    { x: 440, y: 680, l: 150, e: 9 },
    { x: 730, y: 640, l: 120, e: 1.5 },
    { x: 840, y: 470, l: 90, e: 9 },
  ]
  return (
    <svg className="login__fundo" viewBox="0 0 900 760" aria-hidden="true">
      {formas.map((f, i) => (
        <rect
          key={i}
          x={f.x - f.l / 2}
          y={f.y - f.l / 2}
          width={f.l}
          height={f.l}
          rx={f.l * 0.08}
          transform={`rotate(45 ${f.x} ${f.y})`}
          fill="none"
          stroke="#cdb2dc"
          strokeWidth={f.e}
        />
      ))}
    </svg>
  )
}

export function LoginPage() {
  const { adminKey, login, aviso } = useSession()
  const location = useLocation()
  const [chave, setChave] = useState('')
  const [visivel, setVisivel] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const destino = (location.state as { de?: string } | null)?.de ?? '/'
  if (adminKey) {
    return <Navigate to={destino} replace />
  }

  async function entrar(evento: FormEvent) {
    evento.preventDefault()
    if (!chave.trim()) {
      setErro('Informe a chave de acesso.')
      return
    }
    setEnviando(true)
    setErro(null)
    const resultado = await login(chave)
    setEnviando(false)
    if (!resultado.ok) {
      setErro(resultado.mensagem)
    }
  }

  return (
    <div className="login">
      <Losangos />
      <form className="login__cartao" onSubmit={entrar} noValidate>
        <h1 className="login__titulo">Bem-vindo(a)</h1>
        <p className="login__subtitulo">Acesse o painel do Administrador</p>

        <div className="login__form">
          <label className="login__rotulo" htmlFor="chave">
            Chave de acesso
          </label>
          <div className="campo">
            <input
              id="chave"
              type={visivel ? 'text' : 'password'}
              placeholder="Sua chave aqui"
              autoComplete="current-password"
              value={chave}
              onChange={(e) => setChave(e.target.value)}
              aria-invalid={erro !== null}
              aria-describedby="erro-chave"
              autoFocus
            />
            <button
              type="button"
              className="campo__olho"
              onClick={() => setVisivel((v) => !v)}
              aria-label={visivel ? 'Esconder chave' : 'Mostrar chave'}
            >
              {visivel ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
            </button>
          </div>
          <div id="erro-chave" className="login__erro" role="alert">
            {erro ?? aviso}
          </div>
        </div>

        <button type="submit" className="botao botao--grande" disabled={enviando}>
          {enviando ? 'Conferindo a chave…' : 'Entrar na conta'}
        </button>

        {DEMO_MODE && <p className="login__demo">Modo demonstração: qualquer chave entra.</p>}
      </form>
    </div>
  )
}
