# Jira Integration

## Visão Geral

Este projeto integra com a API do Atlassian Jira Cloud para buscar e exibir quadros Agile e sprints. A integração é feita via servidor (Next.js API Routes) para evitar expor credenciais no cliente.

## Como Funciona

### Arquitetura

```
┌─────────────┐     POST /api/jira      ┌─────────────────────┐
│  Frontend   │ ─────────────────────► │  API Route (Next)  │
│  (React)    │ ◄───────────────────── │  src/app/api/jira/  │
└─────────────┘   { issues, sprints } └─────────┬─────────┘
                                                │
                                          Basic Auth
                                                ▼
                                        ┌─────────────────────┐
                                        │   Jira Cloud API    │
                                        │  (rest.api/3,      │
                                        │   rest/agile/1.0)   │
                                        └─────────────────────┘
```

### Endpoint Principal

| Método | Rota | Descrição |
|--------|------|------------|
| POST | `/api/jira` | Recebe credenciais, retorna sprint + issues |

**Request Body:**

```typescript
{
  domain: string;      // dominio.atlassian.net
  email: string;      // usuario@empresa.com
  apiToken: string;   // Token API Atlassian
  boardId: string;    // ID do quadro Agile
  sprintId?: number;  // Sprint específico (opcional)
}
```

**Response:**

```typescript
{
  sprintName: string;
  sprintStartDate: string | null;
  sprintEndDate: string | null;
  selectedSprintId: number | null;
  sprints: SprintInfo[];
  issues: JiraIssue[];
}
```

### Endpoints a Implementar

Os seguintes endpoints devem ser criados para uma integração completa:

| Método | Rota | Descrição |
|--------|------|------------|
| GET | `/api/jira/projects` | Lista projetos acessíveis |
| GET | `/api/jira/issues?project=&status=&assignee=` | Lista issues com filtros |
| GET | `/api/jira/issues/:issueKey` | Detalhes de uma issue |
| GET | `/api/jira/boards` | Lista boards Agile |
| GET | `/api/jira/boards/:boardId/sprints` | Lista sprints de um board |
| POST | `/api/jira/issues` | Cria nova issue (opcional) |

## Configuração de Ambiente

### Variáveis Obrigatórias

```bash
JIRA_DOMAIN=dominio.atlassian.net
JIRA_USER_EMAIL=usuario@empresa.com
JIRA_API_TOKEN=xxxx...
JIRA_BOARD_ID=12345
```

> Nota: Atualmente as credenciais são enviadas pelo cliente (formulário). Para configuração server-side, defina estas variáveis no `.env.local`.

## Autenticação

O projeto usa **Basic Auth** com email + token API:

```typescript
function buildAuthHeader(email: string, apiToken: string) {
  const raw = `${email}:${apiToken}`;
  const base64 = Buffer.from(raw).toString("base64");
  return `Basic ${base64}`;
}
```

## Executando o Agente OpenCode

Para gerar os endpoints proxy automaticamente, use o agente `jira-api-integrator`:

### Usando opencode run

```bash
opencode run -f .opencode/agents/agent/jira-api-integrator.md
```

### Usando opencode agent

```bash
# Criar agente
opencode agent create --name jira-api-integrator --file .opencode/agents/agent/jira-api-integrator.md

# Executar agente
opencode agent run jira-api-integrator --prompt "Crie endpoints /api/jira/projects, /api/jira/issues e /api/jira/boards"
```

### Comandos Úteis

```bash
# Listar agentes disponíveis
opencode agent list

# Verificar agentes configurados
cat ~/.config/opencode/opencode.json
```

## Tipos TypeScript

Os tipos estão definidos em `src/types/jira.ts`:

```typescript
interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  status: string;
  storyPoints?: number | null;
  assignee?: string;
  avatarUrl?: string;
  priority?: string;
  issueType?: string;
  browseUrl?: string;
  labels?: string[];
}

interface JiraConfig {
  domain: string;
  email: string;
  apiToken: string;
  boardId: string;
}

interface SprintInfo {
  id: number;
  name: string;
  state: "active" | "future" | "closed";
  startDate?: string | null;
  endDate?: string | null;
}
```

## Links Úteis

- [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
- [Jira REST API v3](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [Jira Agile API](https://developer.atlassian.com/cloud/jira/software-rest-api/)