# Jira Dashboard - Configuração

## Pré-requisitos

- Node.js 18+ e npm/pnpm/bun
- Conta Atlassian com acesso ao Jira Cloud

## Instalação

```bash
npm install
```

## Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```bash
cp docs/.env.example .env.local
```

Edite o arquivo com suas credenciais do Jira:

| Variável | Descrição | Exemplo |
|---------|-----------|--------|
| `NEXT_PUBLIC_JIRA_DOMAIN` | Domínio do Jira Cloud | `minha-empresa.atlassian.net` |
| `NEXT_PUBLIC_JIRA_USER_EMAIL` | Email da conta Atlassian | `usuario@empresa.com` |
| `NEXT_PUBLIC_JIRA_API_TOKEN` | Token API (ver geração abaixo) | `xxxx...` |
| `NEXT_PUBLIC_JIRA_BOARD_ID` | ID do quadro Agile | `12345` |

## Gerando Token API Atlassian

1. Acesse [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Clique em **Create API token**
3. Dê um nome descritivo (ex: `jira-dashboard`)
4. Copie o token gerado
5. Cole no `.env.local`

## Encontrando o Board ID

1. No Jira, vá para o quadro (Boards > [seu-board])
2. Observe a URL: `https://[dominio]/jira/boards/[BOARD_ID]`
3. O número na URL é o boardId

## Executando Localmente

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## Build para Produção

```bash
npm run build
npm run start
```

## Comandos de Qualidade

| Comando | Descrição |
|---------|-----------|
| `npm run lint` | Verificação ESLint |
| `npm run test` | Testes unitários (Vitest) |
| `npm run test:watch` | Testes em modo watch |