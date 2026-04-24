# Jira Dashboard

Aplicação Next.js para visualizar quadros e sprints do Jira com React 18, shadcn/ui, Tailwind CSS e TanStack Query.

## Documentação

Consulte a pasta [docs/](docs/) para documentação completa:

- [docs/OVERVIEW.md](docs/OVERVIEW.md) - Visão geral da aplicação
- [docs/SETUP.md](docs/SETUP.md) - Configuração e instalação
- [docs/USAGE.md](docs/USAGE.md) - Como usar a interface
- [docs/JIRA_INTEGRATION.md](docs/JIRA_INTEGRATION.md) - Integração com Jira API

## Pré-requisitos

- Node.js 18+ e npm (ou pnpm/bun, se preferir)
- Conta Atlassian com acesso ao Jira Cloud

## Como Rodar Localmente

```sh
npm install
npm run dev
```

Acesse http://localhost:3000

Para configurar as variáveis de ambiente do Jira, veja [docs/SETUP.md](docs/SETUP.md).

Build e produção:

```sh
npm run build
npm run start
```

Consulte [docs/SETUP.md](docs/SETUP.md) para instruções completas de configuração e deploy.

## Testes e qualidade

- Lint: `npm run lint`
- Unitários (Vitest): `npm run test`
- E2E (Playwright): `npx playwright install` e depois `npx playwright test` (quando houver cenários)

## Estrutura principal

- src/app: rotas e páginas (App Router)
- src/components: componentes de UI e blocos de página
- src/hooks: hooks compartilhados (ex.: `useJiraBoard`)
- src/lib: utilidades e helpers
- src/types: tipagens do domínio

## Deploy

Gere o build com `npm run build` e sirva com `npm run start` ou publique em provedores compatíveis com Next.js (Vercel, etc.).
