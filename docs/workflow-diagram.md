# Diagrama do Workflow E2E

> 🟡 Ação humana &nbsp;&nbsp; 🔵 Orquestrador (Claude) &nbsp;&nbsp; 🟢 Subagente &nbsp;&nbsp; 🔴 Decisão

---

## Visão Geral das Fases

```
┌─────────────────────────────────────────────────────────────────────┐
│  FASE 0 — Setup Global       (uma vez por máquina)                  │
│  FASE 1 — /e2e-init          (uma vez por projeto)                  │
│  FASE 2 — /e2e-feature       (uma vez por feature)                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## FASE 0 — Setup Global *(uma vez por máquina)*

```
  [Usuário]
      │
      ├─── Clonar mcp-e2e
      │
      ├─── Criar symlinks globais
      │       ~/.claude/agents   → mcp-e2e/.claude/agents
      │       ~/.claude/commands → mcp-e2e/.claude/commands
      │       ~/.claude/skills   → mcp-e2e/.claude/skills
      │
      └─── Registrar MCPs globais (--scope user)
              playwright-test
              mcp-e2e
```

---

## FASE 1 — /e2e-init *(uma vez por projeto)*

```
  /e2e-init
      │
      ├─ 🔵 PASSO 1 — Verificar pré-requisitos
      │       node >= 18, npm, git
      │       Remover MCP conflitante (playwright --scope user)
      │       Configurar permissões globais (~/.claude/settings.json)
      │
      ├─ 🔵 PASSO 2 — Instalar dependências
      │       Core:       @playwright/test  typescript  tsx  dotenv
      │       Dados:      @faker-js/faker
      │       Validação:  zod
      │       Relatórios: allure-playwright  @allure-js/commons
      │       Qualidade:  eslint  @typescript-eslint/*  eslint-plugin-playwright
      │                   eslint-config-prettier  prettier  lint-staged  husky
      │       npx playwright install chromium
      │
      ├─ 🔵 PASSO 2.5 — Registrar MCPs do projeto (--scope project)
      │       playwright-test
      │       mcp-e2e
      │
      ├─ 🔵 PASSO 3 — Criar estrutura de diretórios (ARCHITECTURE 3)
      │       src/api/services/       → BaseService.ts
      │       src/api/helpers/        → api.helper.ts
      │       src/web/pages/          → BasePage.ts
      │       src/web/helpers/        → web.helper.ts  (inclui screenshotStep)
      │       src/shared/models/      → User.ts
      │       src/shared/factories/   → UserFactory.ts  (CPF com dígitos válidos)
      │       src/shared/fixtures/    → base.fixture.ts
      │       src/shared/helpers/     → env.helper.ts  (Zod + 12 perfis CPF)
      │       tests/api/
      │       tests/web/
      │       specs/bugs/
      │       reports/
      │       .github/workflows/
      │
      ├─ 🔵 PASSO 4 — Gerar arquivos de configuração
      │       playwright.config.ts
      │         ├─ project web-chromium → testDir: ./tests/web
      │         ├─ project api          → testDir: ./tests/api
      │         └─ reporters: html | json | junit | allure-playwright | list
      │       tsconfig.json
      │         └─ paths: @shared/* | @web/* | @api/*
      │
      ├─ 🔵 PASSO 5 — Configurar qualidade de código
      │       eslint.config.mjs    (Flat Config, ESLint v9+)
      │       .prettierrc          (semi, singleQuote, printWidth: 100)
      │       .prettierignore
      │       Husky + lint-staged  (pre-commit: eslint --fix + prettier --write)
      │
      ├─ 🔵 PASSO 6 — GitHub Actions (.github/workflows/e2e.yml)
      │       Job web:  roda tests/web/  →  artifacts: playwright-report
      │                                               allure-results  (30d)
      │                                               junit-results   (30d)
      │       Job api:  roda tests/api/  →  mesmos artifacts
      │
      ├─ 🟡 PASSO 7 — Perguntar URL base + credenciais + repositório
      │       URL base da aplicação
      │       Perfis de autenticação (CPF/senha — 12 perfis disponíveis)
      │       Caminho local do código-fonte (SOURCE_REPO_PATH)
      │       Integração Azure DevOps (opcional)
      │
      ├─ 🔵 PASSO 8 — Criar .env e .env.example
      │       BASE_URL
      │       {PERFIL}_CPF / {PERFIL}_PASSWORD  (admin, n1, n2, n3,
      │         auditor, agricultor, multiplicador, distribuidor,
      │         b2b, avaliador, rtvs, rtvi)
      │       SOURCE_REPO_PATH
      │       AZURE_DEVOPS_ORG / _PROJECT / _PAT
      │
      ├─ 🔵 PASSO 8.5 — Criar .claude/settings.local.json
      │       Permissões pré-aprovadas para subagentes
      │       mcp__playwright-test__*  /  mcp__mcp-e2e__*
      │
      ├─ 🔵 PASSO 9 — Scripts npm
      │       test / test:web / test:api / test:headed / test:debug
      │       lint / lint:fix / format / format:check / typecheck
      │
      ├─ 🔵 PASSO 9 — git init + commit inicial
      │
      └─ 🟡 REINICIAR O CLAUDE CODE
              (obrigatório para ativar os MCPs)
```

---

## FASE 2 — /e2e-feature *(uma vez por feature)*

```
  /e2e-feature [id-nome]
      │
      ├─ 🔵 PASSO 1 — Preparação
      │       ├─ Extrair WORK_ITEM_ID e FEATURE do argumento
      │       │       ex: "1234-login-social" → ID=1234, FEATURE=login-social
      │       ├─ Verificar se requer autenticação
      │       │       Não / Sim (1 perfil) / Sim (múltiplos perfis)
      │       └─ Verificar credenciais no .env (pausa se faltando)
      │
      ├─ 🔵 PASSO 2 — Branch de trabalho  (a partir de qa-stable)
      │       git checkout qa-stable && git pull
      │       ├─ Com ID:   git checkout -b feature/us-ID-FEATURE
      │       └─ Sem ID:   git checkout -b feature/e2e-FEATURE
      │
      │          ╔══════════════════════════════╗
      ├─ 🟡 PASSO 3 — Recording   ← INTERAÇÃO HUMANA 1
      │          ║ npx playwright codegen        ║
      │          ║ Usuário realiza o fluxo       ║
      │          ║ Fecha o browser ao terminar   ║
      │          ╚══════════════════════════════╝
      │          ⚠️  Codegen executa UMA ÚNICA VEZ
      │          Salva: specs/FEATURE-recorded.ts
      │                 specs/FEATURE-recorded.backup.ts
      │
      ├─ 🔵 PASSO 4 — Agentes paralelos de contexto
      │       │
      │       ├─ 🟢 Agente A: e2e-planner          [FOREGROUND]
      │       │       Usa ferramentas MCP de browser
      │       │       Reproduz fluxo do recorded.ts
      │       │       Captura screenshots → specs/screenshots/
      │       │       Gera specs/FEATURE-flow.md
      │       │
      │       ├─ 🟢 Agente B: e2e-context-reader   [BACKGROUND]
      │       │       Lê SOURCE_REPO_PATH do .env
      │       │       Explora código-fonte da aplicação
      │       │       Gera specs/FEATURE-context.md
      │       │
      │       └─ 🟢 Agente C: e2e-workitem-reader  [BACKGROUND]
      │               Só dispara se WORK_ITEM_ID + AZURE_DEVOPS_PAT presentes
      │               Busca Work Item no Azure DevOps (org/project/PAT)
      │               Gera specs/FEATURE-workitem.md
      │               (critérios de aceite → base para cenários obrigatórios)
      │
      ├─ 🟢 PASSO 5 — Planejamento
      │       e2e-planner
      │       Consolida: recorded.ts + flow.md + context.md + workitem.md
      │       Gera specs/FEATURE-plan.md
      │       (smoke + regressão + edge cases)
      │
      │          ╔══════════════════════════════╗
      ├─ 🟡 PASSO 6 — Aprovação do plano ← INTERAÇÃO HUMANA 2
      │          ║ Usuário revisa cenários       ║
      │          ║ Pode solicitar ajustes        ║
      │          ╚══════════════════════════════╝
      │
      ├─ 🟢 PASSO 7 — Desenvolvimento dos testes
      │       e2e-generator
      │       ├─ Lê BasePage.ts + base.fixture.ts antes de criar
      │       ├─ Cria Page Objects   → src/web/pages/[Tela]Page.ts
      │       │       herda BasePage | seletores private get
      │       │       métodos públicos em português
      │       ├─ Registra Pages na fixture → src/shared/fixtures/base.fixture.ts
      │       └─ Cria testes         → tests/web/FEATURE/
      │               smoke.spec.ts       (fluxo feliz)
      │               regression.spec.ts  (variações + negativos)
      │               import test/expect de @shared/fixtures/base.fixture
      │               Allure obrigatório: epic | feature | story | severity
      │                                   description | @ai-generated
      │               Ações em screenshotStep() — nunca allure.step() direto
      │               Credenciais via env.* — nunca hardcoded
      │               Sem page.waitForTimeout() — waits explícitos
      │
      ├─ 🔵 PASSO 8 — Execução
      │       npx playwright test tests/web/FEATURE --project=web-chromium
      │       │
      │       ├─ ✅ Passou? → PASSO 8.5
      │       └─ ❌ Falhou? → PASSO 9
      │
      ├─ 🔵 PASSO 8.5 — Verificação de qualidade de código
      │       npm run lint            (ESLint — sem erros)
      │       npm run format:check    (Prettier — sem erros)
      │       npx tsc --noEmit        (TypeScript — sem erros)
      │       │
      │       ├─ ✅ Tudo passou? → PASSO 10
      │       └─ ❌ Erros? → corrigir e voltar ao PASSO 8
      │
      ├─ 🟢 PASSO 9 — Healer (máx. 3 tentativas)
      │       e2e-healer
      │       ├─ Lê log completo antes de editar qualquer arquivo
      │       ├─ Analisa erros com test_debug
      │       ├─ Corrige em src/web/pages/ e tests/web/FEATURE/
      │       │       seletores / lógica / waits explícitos / assertions
      │       ├─ Documenta bugs de aplicação → specs/bugs/FEATURE-bug-DATA.md
      │       ├─ Pós-correção: npm run lint + typecheck + format:check
      │       │
      │       ├─ Tentativa ≤ 3 → volta ao PASSO 8
      │       └─ Após 3 falhas → ⛔ reporta ao usuário
      │
      ├─ 🟢 PASSO 10 — Code Review
      │       e2e-reviewer
      │       Verifica (quality-rules.md):
      │         ✓ POM: herança BasePage | seletores private get
      │         ✓ Sem assertions no Page Object
      │         ✓ Allure: epic/feature/story/severity/description/@ai-generated
      │         ✓ screenshotStep() — não allure.step() direto
      │         ✓ Path aliases @shared/@web/@api
      │         ✓ import test/expect de @shared/fixtures/base.fixture
      │         ✓ Sem credenciais hardcoded
      │         ✓ Sem waitForTimeout
      │         ✓ Testes independentes
      │       Executa: lint + format:check + typecheck
      │       Aplica correções simples automaticamente
      │       Gera specs/FEATURE-review.md
      │       │
      │       └─ Reprovação crítica → corrige e volta ao PASSO 8
      │
      ├─ 🔵 PASSO 11 — Commit
      │       git add tests/web/FEATURE/  src/web/pages/
      │               src/shared/fixtures/base.fixture.ts
      │               specs/FEATURE-plan.md  specs/FEATURE-review.md
      │       git commit -m "test(e2e): automação da feature FEATURE
      │                       Ref: US-ID"   ← se WORK_ITEM_ID presente
      │
      └─ 🔵 PASSO 12 — Relatório final
              Feature / Branch / Cenários / Testes passando
              Bugs documentados / Code review / Próximo passo: abrir PR
```

---

## Resumo de Agentes por Fase

| Agente                | Fase        | Modo       | Ferramentas                          |
|-----------------------|-------------|------------|--------------------------------------|
| `e2e-planner`         | Passos 4+5  | Foreground | Browser MCP + Read/Write             |
| `e2e-context-reader`  | Passo 4     | Background | Read / Glob / Grep                   |
| `e2e-workitem-reader` | Passo 4     | Background | Bash (Azure DevOps API) / Write      |
| `e2e-generator`       | Passo 7     | Foreground | Browser MCP + Read/Write + Bash      |
| `e2e-healer`          | Passo 9     | Foreground | Browser MCP + test_debug + Bash      |
| `e2e-reviewer`        | Passo 10    | Foreground | Read / Edit / Bash                   |

---

## Interações Humanas

```
  /e2e-feature
       │
       │  ┌──────────────────────────────────────────┐
       ├──│  1ª — Passo 3: Gravar o fluxo             │
       │  │  Usuário opera o browser manualmente      │
       │  └──────────────────────────────────────────┘
       │
       │  ┌──────────────────────────────────────────┐
       └──│  2ª — Passo 6: Aprovar o plano de testes  │
          │  Usuário revisa e confirma os cenários    │
          └──────────────────────────────────────────┘

  Todo o restante é executado automaticamente pela IA.
```

---

## Artefatos Gerados por Feature

```
specs/
├── FEATURE-recorded.ts        ← fluxo gravado pelo Codegen (referência)
├── FEATURE-recorded.backup.ts ← cópia de segurança
├── FEATURE-flow.md            ← fluxo observado via MCP browser (Agente A)
├── FEATURE-context.md         ← análise do código-fonte (Agente B)
├── FEATURE-workitem.md        ← requisitos da US / Azure DevOps (Agente C)
├── FEATURE-plan.md            ← plano de testes aprovado
├── FEATURE-review.md          ← resultado do code review
├── screenshots/               ← evidências capturadas pelo planner
└── bugs/                      ← bugs de aplicação documentados

src/web/pages/
└── [Tela]Page.ts              ← Page Objects da feature

tests/web/FEATURE/
├── smoke.spec.ts              ← cenários de fluxo feliz
└── regression.spec.ts         ← variações, negativos, edge cases

allure-results/                ← dados Allure (não versionados)
junit-results/                 ← XML JUnit para CI (não versionados)
```
