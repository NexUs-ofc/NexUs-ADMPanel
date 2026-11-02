# NexUs ADM Panel

Painel web interno para acompanhar saúde, desempenho e qualidade dos serviços NexUs. A interface reúne métricas das APIs Spring e dos serviços de IA em um só lugar, com autenticação por chave administrativa.

## O que o painel acompanha

| Serviço | Tipo | Principais informações |
| --- | --- | --- |
| API Notify | Spring | Requisições e erros HTTP, latência, JVM, banco, logs e entregas de notificações |
| API Auth | Spring | Requisições e erros HTTP, latência, JVM, conexões do banco e logs |
| API Core | Spring | Requisições e erros HTTP, latência, JVM, conexões do banco e logs |
| API Ceris IA | IA | Execuções e latência do grafo, tokens, custos, cota, juiz, guardrails, ferramentas e leitura de notas |
| API Ceris BI IA | IA | Métricas do serviço de BI IA, consumo e qualidade do grafo |

As páginas Spring mostram séries de tráfego, erros e latência, distribuição de status HTTP, endpoints mais lentos, heap, CPU, pausas de GC, threads, uptime, pool de banco e erros de log. Elas atualizam os dados automaticamente a cada 60 segundos. A API Notify também mostra o resultado de entregas de push.

As páginas de IA permitem escolher períodos de 1, 7, 14 ou 30 dias. Incluem métricas de execução, custo e tokens, ferramentas e decisões do juiz, dados do LangSmith quando disponíveis e um relatório comparativo com o período anterior. Os dados apresentados dependem do que cada serviço expõe.

## Requisitos

- Node.js 22
- npm
- Acesso de rede aos serviços monitorados para consultar dados reais

A versão do Node usada pela pipeline do repositório é a 22.

## Executar localmente

Instale as dependências:

    npm ci

Crie o arquivo local de configuração a partir do exemplo.

PowerShell:

    Copy-Item .env.example .env.local

macOS/Linux:

    cp .env.example .env.local

Edite o .env.local com os endereços dos serviços e, se necessário, o hash da chave administrativa. Depois, inicie o painel:

    npm run dev

O Vite tenta iniciar em http://localhost:5173. Se essa porta estiver ocupada, ele seleciona automaticamente a próxima porta disponível e informa o endereço no terminal.

## Configuração

O Vite lê as variáveis VITE_* de .env.local. Reinicie o servidor de desenvolvimento depois de alterá-las.

| Variável | Exemplo | Uso |
| --- | --- | --- |
| VITE_AUTH_API_URL | http://localhost:8080 | Endereço base da API Auth |
| VITE_CORE_API_URL | http://localhost:8081 | Endereço base da API Core |
| VITE_NOTIFY_API_URL | http://localhost:8082 | Endereço base da API Notify |
| VITE_IA_API_URL | http://localhost:8000 | Endereço base da API Ceris IA |
| VITE_BI_IA_API_URL | http://localhost:8001 | Endereço base da API Ceris BI IA |
| VITE_ADMIN_KEY_SHA256 | SHA-256 em hexadecimal | Opcional. Confere localmente a chave informada no login |
| VITE_DEMO_MODE | false | true usa dados de demonstração gerados no navegador e aceita qualquer chave |

Os endereços acima são valores ilustrativos do arquivo .env.example; substitua-os pelos endereços do seu ambiente. Um endereço vazio deixa o serviço indicado como não configurado.

### Chave administrativa

Configure a mesma chave administrativa nos serviços que o painel deve consultar, usando a configuração ADMIN_API_KEY de cada backend. O painel envia a chave em cada requisição pelo cabeçalho X-Admin-Key.

Há duas formas de validar o login:

1. **Com VITE_ADMIN_KEY_SHA256 preenchido:** o painel compara localmente a chave informada com o hash SHA-256 configurado. O login pode funcionar mesmo se os serviços estiverem indisponíveis; as consultas aos dados ainda precisam alcançar os backends.
2. **Sem o hash configurado:** o painel tenta validar a chave pela rota GET /admin/session dos serviços configurados.

Para gerar o hash SHA-256 em hexadecimal de uma chave:

    node -e "console.log(require('crypto').createHash('sha256').update(process.argv[1]).digest('hex'))" "SUA_CHAVE"

**Segurança:** variáveis com prefixo VITE_ são incorporadas ao JavaScript enviado ao navegador. Use no painel apenas o hash, nunca configure a chave administrativa em texto puro numa variável VITE_*. O hash não substitui a autenticação e autorização do backend. Proteja as rotas /admin dos serviços, use uma chave forte e restrinja o acesso ao painel. Em produção, a chave digitada é enviada do navegador para os serviços no cabeçalho X-Admin-Key.

### Modo demonstração

Defina VITE_DEMO_MODE=true para usar dados de exemplo sem chamar os serviços. Nesse modo, qualquer chave permite entrar e as telas exibem conteúdo simulado. Desative-o para voltar a consultar os backends.

## Rotas consultadas

Todas as consultas autenticadas enviam X-Admin-Key e solicitam JSON.

| Serviço | Rota | Parâmetros |
| --- | --- | --- |
| APIs Spring | GET /admin/metrics | minutos |
| APIs de IA | GET /admin/metrics | dias |
| APIs de IA | GET /admin/report | dias |
| APIs de IA | GET /admin/langsmith | dias |
| Validação alternativa do login | GET /admin/session | Nenhum |

Os contratos esperados estão tipados em src/api/types.ts. A resposta de LangSmith da IA e do BI IA é normalizada em src/api/normalize.ts.

## Proxy local e produção

Durante npm run dev, as chamadas passam pelo proxy do Vite em /__servico/<id>, que encaminha cada serviço para o endereço configurado. Isso evita que o navegador faça chamadas cross-origin diretamente durante o desenvolvimento.

O build de produção chama os endereços configurados diretamente. Configure os backends para aceitar a origem do painel em produção (por exemplo, em CORS_ALLOWED_ORIGINS) e disponibilize as rotas administrativas necessárias. As variáveis VITE_* são resolvidas na hora do build; configure os valores do ambiente antes de compilar.

## Scripts

| Comando | Descrição |
| --- | --- |
| npm run dev | Inicia o servidor de desenvolvimento Vite |
| npm run lint | Executa o ESLint |
| npm run test | Executa os testes com Vitest |
| npm run build | Verifica os tipos TypeScript e gera o build em dist/ |
| npm run preview | Serve localmente o build de produção |
| npm run check | Executa lint, testes e build |

A pipeline do GitHub Actions executa lint, testes e build com Node.js 22.

## Organização do código

    src/
    ├── api/          Chamadas HTTP, contratos, normalização e dados de demonstração
    ├── auth/         Sessão administrativa e validação SHA-256 da chave
    ├── components/   Layout, elementos de interface e gráficos
    ├── hooks/        Consulta autenticada, cancelamento e atualização de dados
    ├── pages/        Login, seleção de serviço e painéis Spring/IA
    ├── styles/       Estilos globais e responsividade
    └── utils/        Formatação de números, períodos e métricas

As configurações dos cinco serviços e das janelas de consulta ficam em src/config.ts. O roteamento e a proteção das páginas estão em src/App.tsx; os dados de cada área são consultados pelos módulos em src/api/.

## Contribuição

Antes de abrir uma alteração, execute:

    npm run check

Mantenha os contratos de API documentados e tipados, não inclua arquivos .env.local, chaves ou outros segredos no repositório e atualize esta README quando os serviços, variáveis ou comandos de desenvolvimento mudarem.
