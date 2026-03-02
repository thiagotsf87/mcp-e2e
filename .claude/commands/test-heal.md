---
description: Diagnostica e corrige testes E2E falhando em uma suite
---

# Test Heal

Use o subagent `e2e-healer` para diagnosticar e corrigir os testes da suite `$ARGUMENTS`.

O argumento pode ser:
- Nome da feature/suite (ex: `xxxx-nome_da_feature`)
- Caminho direto (ex: `tests/xxxx-nome_da_feature/smoke.spec.ts`)
- `all` para auditar toda a suite

Instrução para o subagent:
> "Diagnostique e corrija os testes falhando em `$ARGUMENTS`. Execute os testes, analise os erros, identifique a causa raiz de cada falha e aplique as correções mínimas necessárias. Se a falha for um bug na aplicação, documente em `specs/bugs/`. Re-execute após cada correção para validar. Produza um relatório final com o status de cada teste."

Após o healer finalizar, exiba o relatório de correções ao usuário.
