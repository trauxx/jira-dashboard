# Jira Dashboard - Uso

## Primeiros Passos

1. Configure as variáveis de ambiente (veja SETUP.md)
2. Execute `npm run dev`
3. Abra http://localhost:3000
4. Informedomain, email, token e board ID
5. Clique em "Conectar"

## Interface

### Quadro Kanban

O board exibe 4 colunas:

- **PLANEJADO**: Issues criadas antes do início do sprint
- **A FAZER**: Issues no backlog/to-do
- **EM ANDAMENTO**: Issues em desenvolvimento/revisão
- **CONCLUÍDO**: Issues finalizadas

### Informações do Sprint

Acima do quadro:

- Nome do sprint atual
- Data de início e fim
- Selector para trocar de sprint

### Cards de Issue

Cada card mostra:

- Chave (ex: PROJ-123)
- Título/summary
- Assignee (avatar)
- Story points
- Tipo (Bug, Task, Story, etc)
- Prioridade

### Indicadores

- 🔴 Ponto vermelho: Issue adicionada após planejamento
- Story points totais no header de cada coluna

## Funcionalidades

### Trocar Sprint

Use o dropdown acima do board para selecionar outro sprint (ativo, futuro ou fechado).

### Encerrar Sessão

Clique em "Sair" para limpar as credenciais armazenadas_LOCALMENTE.

### Armazenamento

Credenciais são salvas em localStorage (não expiram até limpar).

## Troubleshooting

### Erro de CORS ou 401

- Verifique email e token estão corretos
- Certifique-se que o token não expirou
- Confirme que o boardId existe

### Erro ao buscar issues

- Verifique permissões da conta no Jira
- Certifique-se que o board é do tipo Scrum/Kanban
- Confirme que o sprint existe e está associado

### Issues não aparecem

- Algumas issues podem não ter campos preenchidos
- Verifique JQL no Network tab do navegador