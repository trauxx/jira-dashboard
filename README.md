# Jira Dashboard

Aplicação Next.js para visualizar quadros e sprints do Jira com React 18, shadcn/ui, Tailwind CSS e TanStack Query.

## Pré-requisitos

- Node.js 18+ e npm (ou pnpm/bun, se preferir)
- Variáveis de ambiente do Jira configuradas conforme seu `.env.local` (host, email/token, etc.)

## Como rodar

```sh
npm install
npm run dev
```

Build e produção:

```sh
npm run build
npm run start
```

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
