<!-- .claude/commands/test-full-cycle.md -->
---
description: "[DEPRECADO] Use /e2e-feature [nome] no lugar deste comando"
---

> ⚠️ **Este comando está deprecado.**
> Use `/e2e-feature [nome]` que implementa o mesmo fluxo de forma mais completa:
> branch automática, agentes paralelos de contexto, code review e commit.

---

# Ciclo Completo de Automação E2E (legado)

Execute os seguintes passos em sequência, usando subagents especializados:

## Passo 1: Planejamento
Use o subagent **e2e-planner** para:
- Explorar a feature/URL fornecida pelo usuário
- Gerar o plano de testes em `specs/`
- Retornar um resumo dos cenários identificados

## Passo 2: Geração
Use o subagent **e2e-generator** para:
- Ler o plano gerado no passo anterior
- Criar os Page Objects necessários
- Gerar os arquivos de teste
- Executar para validação inicial

## Passo 3: Correção
Se houve falhas no passo 2, use o subagent **e2e-healer** para:
- Diagnosticar as falhas
- Aplicar correções
- Re-executar até estabilizar

## Passo 4: Relatório
Use o subagent **e2e-reporter** para:
- Coletar métricas da execução
- Gerar relatório de cobertura
- Listar próximos passos

## Notas
- Cada subagent roda em contexto isolado
- Resultados são passados entre etapas via arquivos em `specs/` e `tests/`
- Se algum passo falhar criticamente, pare e reporte ao usuário
