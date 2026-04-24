# Jira Dashboard - Visão Geral

## O que é

Jira Dashboard é uma aplicação web Next.js para visualizar quadros e sprints do Jira. Permite acompanhar o progresso de sprints, distribuindo issues em colunas de status (Planejado, A Fazer, Em Andamento, Concluído).

## Stack Técnica

- **Framework**: Next.js 14 (App Router)
- **Frontend**: React 18 com TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Estado**: TanStack Query (React Query)
- **Testes**: Vitest (unitários), Playwright (E2E)

## Arquitetura

### Backend (API Routes)

- `src/app/api/jira/route.ts` - Endpoint principal que recebe credenciais do cliente, autentica com Jira via Basic Auth e retorna issues/sprints

### Frontend

- `src/components/SprintBoard.tsx` - Componente principal do quadroKanban
- `src/components/JiraLoginForm.tsx` - Formulário de autenticação
- `src/hooks/useJiraBoard.ts` - Hook para buscar dados do Jira
- `src/types/jira.ts` - Tipagens TypeScript para entidades Jira

### Fluxo de Dados

1. Usuário insere credenciais (domain, email, apiToken, boardId)
2. Frontend envia para `/api/jira` (POST)
3. Backend proxy para Jira Cloud API (REST v3 + Agile API)
4. Retorna issues, sprints e dados do board
5. Frontend distribui issues em colunas por status

## Recursos

- Visualização de sprints ativos e encerrados
- Distribuição automática de issues por coluna
- Indicador de issues adicionadas após planejamento
- Total de story points por coluna
- Armazenamento local das credenciais
- Suporte a múltiplos idiomas de status