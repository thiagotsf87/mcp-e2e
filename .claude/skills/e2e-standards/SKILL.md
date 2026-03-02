<!-- .claude/skills/e2e-standards/SKILL.md -->
---
name: e2e-standards
description: >
  Padrões e convenções de automação E2E deste projeto pessoal.
  Ative quando estiver escrevendo, revisando ou criando testes automatizados.
---

# Padrões de Automação E2E

## Stack Tecnológica
- Framework: Playwright com TypeScript
- Runner: Playwright Test
- CI/CD: GitHub Actions
- Repositório: GitHub

## Estrutura do Projeto

```
automation-e2e/
├── playwright.config.ts
├── tests/
│   ├── pages/           # Page Objects
│   ├── fixtures/        # Custom fixtures e data builders
│   ├── helpers/         # Utilitários compartilhados
│   ├── smoke/           # Testes de smoke (executam em toda PR)
│   └── regression/      # Testes de regressão (executam por schedule)
├── specs/               # Planos de teste e artefatos
│   ├── [feature]-recorded.ts    # Código gravado pelo codegen
│   ├── [feature]-context.md     # Contexto do código-fonte
│   ├── [feature]-plan.md        # Plano de testes aprovado
│   ├── [feature]-review.md      # Resultado do code review
│   └── bugs/                    # Bugs documentados pela automação
├── reports/             # Health reports gerados
└── .claude/
    ├── agents/          # Subagents de automação
    └── commands/        # Slash commands
```

## Convenções de Nomenclatura
- Arquivos de teste: `[feature].spec.ts` ou `[feature]-[cenario].spec.ts`
- Page Objects: `[pagina].page.ts`
- Fixtures: `[recurso].fixture.ts`
- Testes em português: `test('deve [ação esperada]', ...)`

## Quality Gates
- Smoke tests devem passar em < 5 minutos
- Regressão completa em < 30 minutos
- Taxa de flaky tests < 5%
- Cobertura de automação > 60% dos cenários críticos

## Git Flow
- Branch principal: `main`
- Feature branches: `feat/e2e-[feature]`
- Fix branches: `fix/e2e-[feature]`
- Commit após todos os testes passarem
- PR para `main` com descrição dos cenários cobertos

## Code Review Checklist para Testes
- [ ] Usa Page Object Model
- [ ] Locators resilientes (role > testId > text > css)
- [ ] Sem hardcoded waits
- [ ] Dados de teste isolados (não dependem de estado)
- [ ] Assertions claras e específicas
- [ ] Nomes descritivos em português
- [ ] Sem dependência entre testes
