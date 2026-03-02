---
description: Gera código de testes E2E a partir de um plano de testes em Markdown
---

# Test Generate

Use o subagent `e2e-generator` para gerar os testes da feature `$ARGUMENTS`.

O argumento pode ser:
- Nome da feature (ex: `xxxx-nome_da_feature`) → lê `specs/xxxx-nome_da_feature-plan.md`
- Caminho direto do plano (ex: `specs/xxxx-nome_da_feature-plan.md`)

Instrução para o subagent:
> "Implemente os testes E2E para `$ARGUMENTS`. Leia o plano em `specs/$ARGUMENTS-plan.md` (ou o caminho fornecido). Se existir `specs/$ARGUMENTS-recorded.ts`, use como referência de seletores. Crie os Page Objects em `tests/pages/` e os testes em `tests/$ARGUMENTS/`. Execute os testes ao final para validar."

Após o generator finalizar, reporte ao usuário:
- Arquivos criados
- Resultado da execução dos testes
- Problemas encontrados (se houver)
