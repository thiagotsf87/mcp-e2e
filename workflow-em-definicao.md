# Workflow E2E — Definição e Status de Implementação

## Visão Geral

Workflow de automação E2E quase 100% conduzido por IA.
Apenas **duas interações humanas** são necessárias:
1. Gravação do fluxo da feature (Playwright Codegen)
2. Aprovação dos cenários planejados pela IA

---

## Workflow Implementado

### Comandos de entrada

| Comando | Propósito |
|---------|-----------|
| `/e2e-init` | Inicializa a arquitetura completa do projeto (primeira vez) |
| `/e2e-feature [nome]` | Ciclo completo para uma nova feature |

---

### Fluxo do `/e2e-feature [nome]`

```
┌─────────────────────────────────────────────────────┐
│  /e2e-feature [nome]                                │
└──────────────────────┬──────────────────────────────┘
                       │
          ┌────────────▼────────────┐
          │  1. Criar branch        │
          │  feat/e2e-[nome]        │
          └────────────┬────────────┘
                       │
          ┌────────────▼────────────┐
          │  2. Playwright Codegen  │  ← INTERAÇÃO HUMANA 1
          │  (usuário grava fluxo)  │    (gravação do fluxo)
          └────────────┬────────────┘
                       │
          ┌────────────▼──────────────────┐
          │  3. Agentes paralelos         │
          │  A: e2e-planner               │
          │     Reproduz via MCP          │
          │     → specs/[nome]-flow.md    │
          │  B: e2e-context-reader        │
          │     Lê código-fonte           │
          │     → specs/[nome]-context.md │
          └────────────┬──────────────────┘
                       │
          ┌────────────▼────────────┐
          │  4. Planejamento        │
          │  e2e-planner            │
          │  → specs/[nome]-plan.md │
          └────────────┬────────────┘
                       │
          ┌────────────▼────────────┐
          │  5. Aprovação do plano  │  ← INTERAÇÃO HUMANA 2
          │  (usuário aprova/ajusta)│    (aprovação de cenários)
          └────────────┬────────────┘
                       │
          ┌────────────▼────────────┐
          │  6. Geração de testes   │
          │  e2e-generator          │
          │  → tests/[nome]/        │
          │  → tests/pages/         │
          └────────────┬────────────┘
                       │
          ┌────────────▼────────────┐
          │  7. Execução            │
          │  npx playwright test    │
          └────────────┬────────────┘
                       │
              ┌────────┴────────┐
         FALHA│                 │SUCESSO
              │                 │
┌─────────────▼──────┐    ┌─────▼──────────────────┐
│  8a. Falha E2E     │    │  8. Code Review         │
│  e2e-healer        │    │  e2e-reviewer            │
│  (corrige testes)  │    │  → specs/[nome]-review.md│
│  → volta ao 7      │    └─────────────┬────────────┘
│                    │                  │
│  8b. Bug na app    │    ┌─────────────▼────────┐
│  e2e-healer        │    │  9. Commit            │
│  → specs/bugs/     │    │  feat(e2e): [nome]    │
└────────────────────┘    └─────────────┬─────────┘
                                        │
                          ┌─────────────▼────────┐
                          │  10. Relatório final  │
                          │  (resumo ao usuário)  │
                          └──────────────────────┘
```

---

## Artefatos Gerados por Feature

```
specs/
├── [feature]-recorded.ts     # Código gerado pelo Playwright Codegen
├── [feature]-flow.md         # Fluxo documentado pelo Agente A (e2e-planner)
├── [feature]-context.md      # Contexto do código-fonte (e2e-context-reader)
├── [feature]-plan.md         # Plano de cenários (aprovado pelo usuário)
├── [feature]-review.md       # Resultado do code review (e2e-reviewer)
└── bugs/
    └── [feature]-bug-[data].md  # Bug documentado (se houver)

tests/
├── pages/
│   └── [pagina].page.ts      # Page Objects
└── [feature]/
    ├── smoke.spec.ts
    └── regression.spec.ts
```

---

## Status de Implementação

### ✅ Concluído

| Item | Arquivo | Observação |
|------|---------|------------|
| Slash command `/e2e-init` | `.claude/commands/e2e-init.md` | Scaffold completo com playwright.config.ts e GitHub Actions |
| Slash command `/e2e-feature` | `.claude/commands/e2e-feature.md` | Orquestrador principal, 12 passos |
| Slash command `/test-plan` | `.claude/commands/test-plan.md` | |
| Slash command `/test-generate` | `.claude/commands/test-generate.md` | |
| Slash command `/test-heal` | `.claude/commands/test-heal.md` | |
| Slash command `/test-report` | `.claude/commands/test-report.md` | |
| Slash command `/test-full-cycle` | `.claude/commands/test-full-cycle.md` | Marcado como deprecado |
| Agent `e2e-planner` | `.claude/agents/e2e-planner.md` | Tools corrigidas para `mcp__playwright-test__*` |
| Agent `e2e-generator` | `.claude/agents/e2e-generator.md` | Tools corrigidas para `mcp__playwright-test__*` |
| Agent `e2e-healer` | `.claude/agents/e2e-healer.md` | Tools corrigidas, inclui `test_list` e `test_debug` |
| Agent `e2e-reporter` | `.claude/agents/e2e-reporter.md` | |
| Agent `e2e-reviewer` | `.claude/agents/e2e-reviewer.md` | Novo — revisão de código antes do commit |
| Agent `e2e-context-reader` | `.claude/agents/e2e-context-reader.md` | Novo — leitura dedicada de código-fonte |
| Skill `e2e-standards` | `.claude/skills/e2e-standards/SKILL.md` | Sem Renner/GitLab/Kanbanize |
| MCP Server | `src/index.ts` | Lógica real implementada |
| `.mcp.json` | `.mcp.json` | Inclui `playwright-test` e `mcp-e2e` |
| `settings.local.json` | `.claude/settings.local.json` | MCPs e permissões Bash corretos |
| `tsconfig.json` | `tsconfig.json` | jsx removido, configurado para `src/` |
| `package.json` | `package.json` | Scripts de teste e mcp adicionados |
| `.gitignore` | `.gitignore` | Criado |
| Remoção de referências Renner/GitLab/Kanbanize | todos os arquivos | Concluído |

### ⏳ Pendente — A executar pelo usuário

| Item | Como resolver |
|------|---------------|
| Estrutura de diretórios (`tests/`, `reports/`, `specs/bugs/`) | Executar `/e2e-init` |
| `playwright.config.ts` | Executar `/e2e-init` |
| `tsconfig.playwright.json` | Executar `/e2e-init` |
| GitHub Actions workflow | Executar `/e2e-init` |
| GitHub remote | `git remote add origin [url-do-repo]` |

### ℹ️ Decisões tomadas

| Item | Decisão |
|------|---------|
| `test-full-cycle.md` | Mantido como legado com aviso de deprecação — substituído por `/e2e-feature` |
| `seed.spec.ts` | Permanece na raiz como template de seed do playwright-test MCP |
| Agents `playwright-test-*` | São agents nativos do Claude Code — usados pelo MCP playwright-test. Coexistem com os agents `e2e-*` customizados |
| Agente B do fluxo | Usa `e2e-context-reader` (agent dedicado, criado). O `e2e-planner` se mantém focado em exploração via browser |

---

## Distribuição como Pacote (futuro)

> Status: **documentado, não implementado.** Testar o fluxo local antes de evoluir para isso.

### Problema

A configuração global (`~/.claude/agents`, `~/.claude/commands`, MCPs) é **local por máquina**.
Em outra máquina ou para outro usuário, todo o setup precisa ser refeito manualmente.

### Solução: publicar no npm

Transformar o `mcp-e2e` em um pacote npm com dois pontos de entrada:

**1. MCP Server via npx (sem instalação)**

Qualquer projeto poderia usar as tools adicionando ao `.mcp.json`:
```json
{
  "mcpServers": {
    "mcp-e2e": {
      "command": "npx",
      "args": ["@usuario/mcp-e2e"]
    },
    "playwright-test": {
      "command": "npx",
      "args": ["playwright", "run-test-mcp-server"]
    }
  }
}
```

**2. Comando `setup` para configurar agents/commands globalmente**

```bash
# Em qualquer máquina nova, após clonar ou via npx:
npx @usuario/mcp-e2e setup
```

Esse comando faria automaticamente:
1. Baixar/atualizar agents, commands e skills para `~/.claude/`
2. Registrar os MCPs globalmente via `claude mcp add`
3. Confirmar ao usuário o que foi configurado

**Limitação atual do Claude Code:** agents e commands precisam ser arquivos locais —
não existe carregamento remoto nativo. O comando `setup` contorna isso copiando/linkando
os arquivos para `~/.claude/` na máquina do usuário.

### O que precisaria ser feito para implementar

- [ ] Criar `bin/setup.js` — script de setup global
- [ ] Criar `bin/mcp-e2e.js` — entry point do MCP server para o npm
- [ ] Atualizar `package.json` com `"bin"`, `"files"` e `"publishConfig"`
- [ ] Testar com `npm pack` antes de publicar
- [ ] Publicar no npm: `npm publish --access public`

---

## Próximo Passo

Executar `/e2e-init` para criar a estrutura de diretórios e arquivos de configuração do Playwright.
