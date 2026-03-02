<!-- CLAUDE.md (raiz do projeto) -->
# Automação E2E — Projeto Pessoal

## Contexto
Projeto pessoal de automação de testes E2E com Playwright + Claude Code.
O objetivo é um workflow quase 100% conduzido por IA, com apenas duas
interações humanas: gravação do fluxo e aprovação dos cenários planejados.

## Stack
- Playwright + TypeScript
- Page Object Model
- GitHub Actions para execução
- GitHub para gestão de repositório

## Regras
- Sempre use POM para novos testes
- Testes em português
- Seletores resilientes (role > testId > text)
- Rode testes antes de commitar
- Siga Git Flow com branches por feature

## MCP Servers Disponíveis
- `playwright-test`: MCP do Playwright para execução e geração de testes
- `mcp-e2e`: Tools customizadas (run tests, health report, quality gates)

## Subagents Disponíveis
- `e2e-planner`: Planejamento de cenários
- `e2e-generator`: Geração de código de teste
- `e2e-healer`: Diagnóstico e correção de falhas
- `e2e-reporter`: Geração de relatórios
- `e2e-reviewer`: Revisão de qualidade do código gerado

## Slash Commands
- `/e2e-init`: Inicializa a arquitetura completa do projeto
- `/e2e-feature [nome]`: Ciclo completo para uma nova feature
- `/test-plan [feature]`: Planeja testes para uma feature
- `/test-generate [plan]`: Gera código a partir de um plano
- `/test-heal [suite]`: Corrige testes falhando
- `/test-report [period]`: Gera health report
- `/test-full-cycle [feature]`: Ciclo completo legado
