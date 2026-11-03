# Containers e Kubernetes

## Padrão comum

- `Dockerfile` na raiz; build e runtime separados quando há compilação/dependências.
- Processo sem root; credenciais fora da imagem e da configuração versionada.
- `k8s/kustomization.yaml`, namespace `nexus`, imagem `nexus-admpanel:local` substituível por qualquer registry.
- Sem conta cloud, registry ou integração de autenticação de um provedor específico.
- A infraestrutura é uma alternativa portátil. Não substitui as hospedagens atuais em Discloud, Render e Vercel.
- A CI compila a imagem e renderiza os manifests; não publica imagens nem executa deploys.

## Imagem local

Execute os comandos a partir da raiz deste repositório, com Docker Engine em execução:

```sh
docker build -t nexus-admpanel:local .
docker run --rm -p 8080:8080 nexus-admpanel:local
```

## Configuração do site

Os valores `VITE_*` são públicos e incorporados ao JavaScript durante o build, não ao iniciar o Pod. Não use credenciais privadas nessas variáveis. Passe as configurações necessárias via `--build-arg NOME=valor`; alterar um Secret no Kubernetes não reconfigura o bundle.

Argumentos aceitos: `VITE_AUTH_API_URL`, `VITE_CORE_API_URL`, `VITE_NOTIFY_API_URL`, `VITE_IA_API_URL`, `VITE_BI_IA_API_URL`, `VITE_ADMIN_KEY_SHA256`, `VITE_DEMO_MODE`.

O Nginx serve a SPA em 8080 e devolve `index.html` nas rotas do React Router. O healthcheck usa `/healthz`. As APIs precisam aceitar a origem pública do site.

## Kubernetes em qualquer cluster

É necessário um cluster configurado no seu kubeconfig. Para usar registry remoto:

1. Compile e publique a imagem em um registry sob seu controle.
2. Dentro de `k8s/`, execute `kubectl kustomize` após ajustar `images` no `kustomization.yaml` (ou use `kustomize edit set image nexus-admpanel=REGISTRY/PROJETO/nexus-admpanel:TAG`). `REGISTRY`, `PROJETO` e `TAG` são substituições obrigatórias para esse exemplo.
3. Em registry privado, configure `imagePullSecrets` no cluster. Não é necessário um registry específico.

Para Kind/Minikube, carregue `nexus-admpanel:local` nos nós usando `kind load docker-image` ou `minikube image load`. A política `IfNotPresent` permite a imagem local.

```sh
kubectl kustomize k8s
kubectl apply -k k8s
kubectl rollout status deployment/nexus-admpanel -n nexus --timeout=5m
kubectl port-forward service/nexus-admpanel 8080:80 -n nexus
```

O Service é `ClusterIP`: o acesso local é por port-forward. Para produção, configure Ingress/Gateway e TLS conforme o cluster. A configuração não presume LoadBalancer de cloud.

Os probes verificam a inicialização e disponibilidade HTTP do processo, não o funcionamento integral das integrações externas. Ajuste limites de CPU/memória a partir de medições reais.

## Referências

- https://docs.docker.com/build/building/multi-stage/
- https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
