---
description: Executa o ciclo completo de automação E2E para uma nova feature — do recording ao commit
---

# E2E Feature — Ciclo Completo

Este comando orquestra o workflow completo de automação para uma feature.
Há exatamente **duas interações humanas**: gravação do fluxo e aprovação dos cenários.
Todos os demais passos são executados automaticamente pela IA.

O argumento `$ARGUMENTS` é o nome da feature.

---

## Passo 1: Preparação

### 1.1 — Validar argumento

Se `$ARGUMENTS` estiver vazio, faça **apenas** esta pergunta, sem nenhum texto adicional:
> "Qual o nome da feature que será automatizada?"

Aguarde a resposta. Use exatamente o valor informado (converta para minúsculas com hífens). **Não ofereça exemplos, sugestões, opções ou qualquer outro texto.** Apenas a pergunta acima.

**Extraia o Work Item ID (se presente):**

Se o argumento tiver formato `{número}-{nome}` (ex: `1234-login-social`):
- `WORK_ITEM_ID = "1234"`
- `FEATURE = "login-social"`

Se não houver número prefixado:
- `WORK_ITEM_ID = ""` (vazio)
- `FEATURE = valor completo informado`

Verifique se `playwright.config.ts` existe. Se não existir, oriente o usuário a rodar `/e2e-init` primeiro e pare.

### 1.2 — Verificar se a feature requer autenticação

Leia o arquivo `.env` para identificar quais perfis estão disponíveis.

Pergunte ao usuário:
> "Esta feature requer que o usuário esteja autenticado?"
>
> 1. Não — a feature é pública, sem login necessário
> 2. Sim — perfil único (informe qual: admin, n1, n2, n3, auditor, agricultor, multiplicador, distribuidor, b2b, avaliador, rtvs, rtvi)
> 3. Sim — múltiplos perfis (informe quais)

**Se "Não" (opção 1):** defina `AUTH_REQUIRED=false` e `AUTH_PROFILES=[]`, siga para o Passo 2.

**Se opção 2 ou 3:** defina `AUTH_REQUIRED=true`, registre os perfis em `AUTH_PROFILES` e execute o passo 1.3.

### 1.3 — Verificar credenciais no .env

Leia o arquivo `.env` e para cada perfil em `AUTH_PROFILES`, verifique se as variáveis `{PERFIL}_CPF` e `{PERFIL}_PASSWORD` estão preenchidas (ex: `ADMIN_CPF`, `ADMIN_PASSWORD`).

**Se as credenciais necessárias estiverem preenchidas:** registre quais perfis serão usados e siga para o Passo 2.

**Se estiverem vazias ou ausentes:** informe o usuário e **pause até que sejam preenchidas**:

> "⚠️  As credenciais de teste não estão configuradas no `.env`.
>
> Preencha as variáveis abaixo antes de continuar:
> ```
> [lista das variáveis que estão faltando]
> ```
> Após preencher o `.env`, confirme para continuar."

Aguarde a confirmação do usuário antes de prosseguir.

---

## Passo 2: Criar branch de trabalho

A branch deve seguir o padrão `feature/us-{WORK_ITEM_ID}-{FEATURE}` e partir de `qa-stable` (Regras 5.2 e 7.1).

**Se `WORK_ITEM_ID` não estiver vazio:**
```bash
git checkout qa-stable
git pull
git checkout -b feature/us-$WORK_ITEM_ID-$FEATURE
```

**Se `WORK_ITEM_ID` estiver vazio:**
```bash
git checkout qa-stable
git pull
git checkout -b feature/e2e-$FEATURE
```

Se a branch já existir, use a existente com `git checkout [nome da branch]`.

---

## Passo 3: Gravação do fluxo (1ª interação humana)

Informe o usuário:

> **Ação necessária:** Vou abrir o Playwright Codegen. Realize o fluxo principal da feature `$FEATURE` no browser e feche quando terminar.

Execute o codegen via Bash (passando a BASE_URL para abrir o browser já na aplicação):
```bash
BASE_URL=$(grep '^BASE_URL=' .env 2>/dev/null | cut -d'=' -f2)
npx playwright codegen --output specs/$FEATURE-recorded.ts $BASE_URL
```

Aguarde o usuário fechar o browser. Após o fechamento, leia o arquivo gerado em `specs/$FEATURE-recorded.ts`.

Se o arquivo estiver vazio ou não existir, informe o usuário e ofereça tentar novamente.

Salve o arquivo gravado também como referência:
```bash
cp specs/$FEATURE-recorded.ts specs/$FEATURE-recorded.backup.ts
```

> ⚠️ **Uso único:** O Playwright Codegen é executado **somente neste passo**. Nenhum agente ou etapa subsequente deve reabrir o codegen. Toda interação com o browser a partir daqui é realizada via ferramentas MCP (`mcp__playwright-test__browser_*`).

---

## Passo 4: Agentes paralelos de contexto

Leia o arquivo `.env` e extraia os valores de `SOURCE_REPO_PATH`, `AZURE_DEVOPS_ORG`, `AZURE_DEVOPS_PROJECT` e `AZURE_DEVOPS_PAT`.

Dispare **até três subagents em paralelo** usando o Task tool simultaneamente:

### Agente B — Leitor do código-fonte (subagent: `e2e-context-reader`) — rodar com `run_in_background=true`

> Use `subagent_type='e2e-context-reader'` (agente customizado do projeto). Não use `Explore` — ele é somente leitura e não consegue gravar arquivos.

Este agente não usa ferramentas de browser e pode rodar em background com segurança.

**Se `SOURCE_REPO_PATH` estiver preenchido no `.env`:**
> "Explore o código-fonte em `[SOURCE_REPO_PATH]` para entender a feature `$FEATURE`: componentes envolvidos, validações, estados possíveis e regras de negócio. Salve o contexto em `specs/$FEATURE-context.md` no projeto de automação."

**Se `SOURCE_REPO_PATH` estiver vazio ou ausente:**
> "O repositório de código-fonte não está configurado (SOURCE_REPO_PATH vazio no .env). Com base no arquivo `specs/$FEATURE-recorded.ts`, infira o que for possível sobre a feature `$FEATURE` e documente em `specs/$FEATURE-context.md`. Registre que a análise de código-fonte ficou pendente."

### Agente C — Leitor de Work Item (subagent: `e2e-workitem-reader`) — rodar com `run_in_background=true`

Disparar **somente se** `WORK_ITEM_ID` não estiver vazio **e** `AZURE_DEVOPS_PAT` estiver preenchido no `.env`. Caso contrário, pular silenciosamente.

> "Busque o work item `$WORK_ITEM_ID` do Azure DevOps (org: `$AZURE_DEVOPS_ORG`, project: `$AZURE_DEVOPS_PROJECT`, PAT: `$AZURE_DEVOPS_PAT`) e salve o contexto em `specs/$FEATURE-workitem.md`."

### Agente A — Reprodutor via MCP (subagent: `e2e-planner`) — rodar em foreground (sem `run_in_background`)

> Use `subagent_type='e2e-planner'` (agente customizado do projeto). Não use `playwright-test-planner` — ele não tem permissão para as ferramentas MCP neste contexto.

Este agente usa ferramentas MCP de browser e **não pode rodar em background** — ferramentas de browser são bloqueadas em modo background.

> "Leia o arquivo `specs/$FEATURE-recorded.ts` e reproduza o fluxo gravado usando as ferramentas MCP do Playwright (`mcp__playwright-test__browser_navigate`, `mcp__playwright-test__browser_click`, etc.) para capturar screenshots e validar o estado atual da aplicação. Salve os screenshots em `specs/screenshots/`. Documente o fluxo observado (URLs visitadas, elementos interagidos, estados da UI) em `specs/$FEATURE-flow.md`."

---

## Passo 5: Planejamento de cenários

Verifique quais arquivos de contexto existem em `specs/`:
- `specs/$FEATURE-flow.md` — fluxo observado via browser (Agente A)
- `specs/$FEATURE-context.md` — análise do código-fonte (Agente B)
- `specs/$FEATURE-workitem.md` — requisitos e critérios de aceite da US (Agente C, se disponível)

Use o subagent `e2e-planner` com a instrução:
> "Com base nos seguintes arquivos de contexto disponíveis em `specs/`:
> - `specs/$FEATURE-recorded.ts` (fluxo gravado)
> - `specs/$FEATURE-flow.md` (fluxo observado)
> - `specs/$FEATURE-context.md` (código-fonte)
> - `specs/$FEATURE-workitem.md` (requisitos da US — se existir)
>
> Planeje os cenários de teste E2E para a feature `$FEATURE`. Se o workitem.md estiver disponível, use os critérios de aceite como base para os cenários obrigatórios. Inclua cenários de smoke (fluxo feliz), regressão (variações e negativos) e edge cases. Salve o plano em `specs/$FEATURE-plan.md`."

---

## Passo 6: Aprovação do plano (2ª interação humana)

Após o planner finalizar, **apresente ao usuário** os cenários identificados:

> "O plano de testes para `$FEATURE` foi criado com os seguintes cenários:
> [liste os cenários do specs/$FEATURE-plan.md]
>
> - Os cenários fazem sentido?
> - Há algum para adicionar ou remover?
> - Podemos prosseguir com o desenvolvimento?"

**Aguarde a aprovação do usuário antes de continuar.**
Se o usuário solicitar ajustes, atualize `specs/$FEATURE-plan.md` e mostre novamente para aprovação.

---

## Passo 7: Desenvolvimento dos testes

Use o subagent `e2e-generator` com a instrução:
> "Implemente os testes E2E para a feature `$FEATURE` com base no plano aprovado em `specs/$FEATURE-plan.md`. Use o código gravado em `specs/$FEATURE-recorded.ts` como referência de seletores e navegue pela aplicação para validá-los.
>
> **Arquitetura obrigatória:**
> - Page Objects em `src/web/pages/` — herdar de `BasePage` (`src/web/pages/BasePage.ts`)
> - Services de API (se houver) em `src/api/services/` — herdar de `BaseService` (`src/api/services/BaseService.ts`)
> - Testes em `tests/web/$FEATURE/smoke.spec.ts` (cenários de smoke) e `tests/web/$FEATURE/regression.spec.ts` (demais)
> - Testes importam `test` e `expect` de `src/shared/fixtures/base.fixture.ts` via alias `@shared/fixtures/base.fixture`, nunca de `@playwright/test` diretamente
> - Helpers reutilizáveis em `src/web/helpers/web.helper.ts` (se web) ou `src/api/helpers/api.helper.ts` (se api)
> - Dados de ambiente via `env` de `@shared/helpers/env.helper` — nunca credenciais hardcoded
> - Dados sintéticos via factories em `src/shared/factories/`
> - Seletores no Page Object são sempre `private get` — o teste nunca acessa locators diretamente
> - Nunca faça assertions dentro do Page Object — apenas o teste faz `expect()`
> - Registre as novas Page Objects no fixture em `src/shared/fixtures/base.fixture.ts`
> - **Allure obrigatório em cada `test()`:** `allure.epic()`, `allure.feature()`, `allure.story()`, `allure.severity()`, `allure.description()`, `allure.tag('@ai-generated')`
> - **Ações web** envolvidas em `screenshotStep()` importado de `@web/helpers/web.helper` — nunca `allure.step()` diretamente
> - Nunca `page.waitForTimeout()` — usar waits explícitos (ex: `waitForLoadState`, `waitFor({ state: 'visible' })`)
> - Após gerar o código, execute `npm run lint`, `npm run format:check` e `npx tsc --noEmit` e corrija qualquer erro"

---

## Passo 8: Execução dos testes

Após o generator finalizar, execute os testes via Bash:
```bash
npx playwright test tests/web/$FEATURE --project=web-chromium
```

---

## Passo 8.5: Verificação de qualidade de código (Regras 2.3, 9.3, 10.3)

Antes de prosseguir, execute obrigatoriamente as verificações de qualidade:

```bash
npm run lint
```

```bash
npm run format:check
```

```bash
npx tsc --noEmit
```

Se houver erros em qualquer uma dessas verificações, corrija-os antes de seguir para o Passo 9. Não use `// eslint-disable` para suprimir erros de lint.

---

## Passo 9: Tratamento de falhas

### Se houver falhas de automação (testes mal implementados):

**Antes de instanciar o `e2e-healer`, avalie o log de erro:**

- **Causa óbvia** (seletor errado, import faltando, assertion incorreta, URL errada): corrija diretamente — leia o log completo, identifique **todos** os padrões de uma vez, aplique correções em batch e volte ao Passo 8. Não use subagente para problemas simples.
- **Causa não óbvia** (comportamento inesperado da UI, timing, estado inconsistente): delegue ao `e2e-healer`.

Se delegar ao `e2e-healer`, use a instrução:
> "Os testes da feature `$FEATURE` estão falhando. Use `test_list` para ver todos os testes, `test_run` para executar e `test_debug` para inspecionar cada falha. Diagnostique e corrija os problemas nos arquivos em `tests/web/$FEATURE/` e `src/web/pages/`. Re-execute até estabilizar. Se algum teste falhar por bug na aplicação, documente em `specs/bugs/$FEATURE-bug-[data].md` e marque o teste como skip."

Após corrigir (diretamente ou via healer), volte para o Passo 8. Repita até passar ou atingir 3 tentativas — se após 3 tentativas ainda houver falhas, reporte ao usuário e aguarde orientação.

### Se todos os testes passarem, siga para o Passo 10.

---

## Passo 10: Code Review

Use o subagent `e2e-reviewer` com a instrução:
> "Revise o código gerado para a feature `$FEATURE`: arquivos em `tests/web/$FEATURE/` e `src/web/pages/`. Verifique conformidade com o checklist completo do quality-rules.md:
> - POM: herança de `BasePage`, seletores `private get`, sem assertions no Page Object
> - Locators resilientes: `getByTestId` > `getByRole` > `getByText` — sem CSS frágil ou XPath
> - Sem `waitForTimeout` ou waits estáticos (Regra NR-12)
> - Testes independentes, sem dependência de estado entre testes
> - Nomes dos testes em português no formato 'deve [verbo] [resultado]'
> - `test` e `expect` importados de `@shared/fixtures/base.fixture` (nunca de `@playwright/test`)
> - Path aliases usados: `@shared/*`, `@web/*`, `@api/*`
> - Anotações Allure obrigatórias em cada teste: `epic`, `feature`, `story`, `severity`, `description`, `@ai-generated`
> - Ações web envolvidas em `screenshotStep()` — nunca `allure.step()` diretamente
> - Sem credenciais hardcoded — usa `env.*` de `@shared/helpers/env.helper`
> - Execute `npm run lint`, `npm run format:check` e `npx tsc --noEmit` e corrija erros
> - Aplique correções simples automaticamente. Salve o resultado em `specs/$FEATURE-review.md`."

Se o reviewer reprovar itens críticos, aplique as correções indicadas e volte ao Passo 8.

---

## Passo 11: Commit

Após todos os testes passarem e o review aprovar, faça o commit via Bash (Regras 5.3, 9.4):

**Se `WORK_ITEM_ID` não estiver vazio:**
```bash
git add tests/web/$FEATURE/ src/web/pages/ src/shared/fixtures/base.fixture.ts specs/$FEATURE-plan.md specs/$FEATURE-review.md
git commit -m "$(cat <<'EOF'
test(e2e): automação da feature $FEATURE

Ref: US-$WORK_ITEM_ID
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

**Se `WORK_ITEM_ID` estiver vazio:**
```bash
git add tests/web/$FEATURE/ src/web/pages/ src/shared/fixtures/base.fixture.ts specs/$FEATURE-plan.md specs/$FEATURE-review.md
git commit -m "$(cat <<'EOF'
test(e2e): automação da feature $FEATURE

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Passo 12: Relatório final

Apresente ao usuário um resumo:
- Feature automatizada: `$FEATURE`
- Branch: `feature/us-$WORK_ITEM_ID-$FEATURE` (ou `feature/e2e-$FEATURE` se sem Work Item ID)
- Cenários implementados: (lista dos CTs)
- Testes passando: X/Y
- Bugs documentados: (se houver, com link para `specs/bugs/`)
- Code review: Aprovado / Aprovado com ressalvas
- Próximo passo: abrir PR para `main` quando pronto

---

## Notas de Orquestração

- Cada subagent recebe contexto via arquivos em `specs/`
- Se um passo falhar criticamente (>3 tentativas de correção), pare e reporte ao usuário
- **Nunca pule a aprovação do Passo 6** — é uma interação humana obrigatória
- **Nunca faça commit sem os testes passando**
- Os arquivos `specs/$FEATURE-recorded.ts` e `specs/$FEATURE-context.md` são artefatos auxiliares — não precisam ir no commit final
