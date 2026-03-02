---
description: Planeja cenários de teste E2E para uma feature específica
---

# Test Plan

Use o subagent `e2e-planner` para planejar os cenários de teste da feature `$ARGUMENTS`.

Instrução para o subagent:
> "Explore a feature `$ARGUMENTS`. Se houver um arquivo gravado em `specs/$ARGUMENTS-recorded.ts`, use-o como base. Se houver contexto em `specs/$ARGUMENTS-context.md`, utilize também. Navegue pela aplicação para entender o fluxo atual. Produza o plano de testes em `specs/$ARGUMENTS-plan.md` seguindo o formato padrão com cenários CT-001, CT-002, etc."

Após o planner finalizar, exiba o resumo dos cenários identificados para o usuário.
