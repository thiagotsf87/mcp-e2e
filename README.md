# mcp-e2e — Automação E2E com IA

Projeto pessoal de automação de testes E2E com **Playwright + Claude Code**.

O workflow é quase 100% conduzido por IA, com apenas **duas interações humanas**:
1. Gravação do fluxo da feature (Playwright Codegen)
2. Aprovação dos cenários planejados

---

## Início Rápido

```bash
# 1. Instalar dependências
npm install

# 2. Inicializar arquitetura do projeto (primeira vez)
/e2e-init

# 3. Automatizar uma feature
/e2e-feature login
```

---

## Stack

| Tecnologia | Uso |
|------------|-----|
| Playwright + TypeScript | Framework de automação |
| Claude Code | Orquestração do workflow via IA |
| GitHub Actions | CI/CD |
| MCP (Model Context Protocol) | Integração Claude ↔ Playwright |

---

## Estrutura do Projeto

```
mcp-e2e/
├── src/
│   └── index.ts                  # MCP Server customizado
├── tests/                        # Criado pelo /e2e-init
│   ├── pages/                    # Page Objects
│   ├── fixtures/                 # Custom fixtures
│   ├── helpers/                  # Utilitários
│   ├── smoke/                    # Testes de smoke
│   └── regression/               # Testes de regressão
├── specs/                        # Planos e artefatos por feature
│   ├── [feature]-recorded.ts     # Código gravado pelo Codegen
│   ├── [feature]-plan.md         # Plano de cenários aprovado
│   ├── [feature]-review.md       # Resultado do code review
│   └── bugs/                     # Bugs documentados
├── reports/                      # Health reports gerados
├── .github/workflows/            # Criado pelo /e2e-init
│   └── e2e.yml                   # GitHub Actions
├── .claude/
│   ├── agents/                   # Subagents especializados
│   ├── commands/                 # Slash commands
│   └── skills/                   # Padrões e convenções
├── playwright.config.ts          # Criado pelo /e2e-init
└── .mcp.json                     # Registro dos MCP servers
```

---

## Slash Commands

### Principais

| Comando | Descrição |
|---------|-----------|
| `/e2e-init` | Inicializa toda a arquitetura do projeto |
| `/e2e-feature [nome]` | Ciclo completo para uma nova feature |

### Utilitários

| Comando | Descrição |
|---------|-----------|
| `/test-plan [feature]` | Planeja cenários para uma feature |
| `/test-generate [feature]` | Gera código a partir de um plano |
| `/test-heal [suite]` | Diagnostica e corrige testes falhando |
| `/test-report [período]` | Gera Automation Health Report |

---

## Subagents

| Agent | Papel |
|-------|-------|
| `e2e-planner` | Explora app e produz plano de testes |
| `e2e-generator` | Gera Page Objects e testes a partir do plano |
| `e2e-healer` | Diagnostica e corrige testes falhando |
| `e2e-reporter` | Gera relatórios de saúde da automação |
| `e2e-reviewer` | Revisa qualidade do código antes do commit |

---

## MCP Servers

| Server | Função |
|--------|--------|
| `playwright-test` | Controle de browser e execução de testes |
| `mcp-e2e` | Tools customizadas (run tests, health report, quality gates) |

---

## Fluxo do `/e2e-feature`

```
Criar branch → Gravar fluxo* → Agentes paralelos → Planejar →
Aprovar* → Gerar testes → Executar → [Corrigir] → Review → Commit

* = interação humana
```

Detalhes completos: [`workflow-em-definicao.md`](./workflow-em-definicao.md)

---

## Status do Projeto

Veja [`workflow-em-definicao.md`](./workflow-em-definicao.md) para o status detalhado de implementação e itens pendentes.
