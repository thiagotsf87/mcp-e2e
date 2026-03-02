---
description: Gera o Automation Health Report com scoring de maturidade
---

# Test Report

Use o subagent `e2e-reporter` para gerar o health report do período `$ARGUMENTS`.

O argumento é o período (ex: `2026-Q1`, `2026-03`). Se não fornecido, use o mês atual.

Instrução para o subagent:
> "Gere o Automation Health Report para o período `$ARGUMENTS`. Analise os arquivos de teste em `tests/`, os resultados em `playwright-report/` (se existirem), a configuração de CI em `.github/workflows/`, e os bugs documentados em `specs/bugs/`. Calcule o score por dimensão (cobertura, estabilidade, frequência, manutenibilidade, CI/CD, documentação) e produza o relatório completo em `reports/health-report-$ARGUMENTS.md`."

Após o reporter finalizar, exiba o dashboard de métricas e o score geral ao usuário.
