# FEEDBACK — Workflow IA de Automação E2E

Documento de lições aprendidas e pontos de melhoria identificados durante a execução do ciclo `/e2e-feature`.

---

## Sessão: feat/e2e-login — 2026-03-02

### Problema: ~1 hora presa em correção de bugs de código gerado pela própria IA

#### O que aconteceu

Após a geração dos testes de `login`, 5 testes falharam na primeira execução. A correção levou três rodadas de execução e ~30 minutos, quando deveria ter levado uma única rodada de ~5 minutos.

---

### Causa-raiz 1: Delegação desnecessária de tarefa simples

**O que foi feito:** Ao ver as 5 falhas, foi instanciado o subagente `playwright-test-healer` — um agente pesado, feito para diagnóstico de falhas complexas.

**O problema:** As causas já estavam explícitas no log de erro. Não havia nada a diagnosticar. O subagente levou ~7 minutos para iniciar, foi cancelado pelo usuário antes de concluir, e o resultado foi zero — as correções foram feitas manualmente logo depois.

**Regra:** Se o log de erro já explica a causa, corrigir diretamente. Só usar subagente de healer quando o erro for não óbvio ou exigir navegação interativa na aplicação.

---

### Causa-raiz 2: Correção por partes em vez de análise completa antes de editar

**O que foi feito:** Os erros foram corrigidos um a um conforme apareciam nas rodadas de execução.

**O problema:** Havia um padrão transversal ignorado — múltiplos testes usavam `expect(page.getByText(/abrir chamado/i)).toBeVisible()` para validar login bem-sucedido, mas nem todos os perfis têm esse elemento no dashboard (N3, Multiplicador). Isso era visível antes da primeira rodada de correção, e foi corrigido apenas na segunda.

Resultado: foram necessárias 3 rodadas de execução quando uma única seria suficiente.

**Regra:** Antes de editar qualquer arquivo após uma falha, ler o log completo, identificar todos os padrões de erro e corrigir tudo de uma vez.

---

### Causa-raiz 3: Suposição incorreta sobre armazenamento de sessão

**O que foi feito:** Para limpar a sessão entre dois fluxos de login no mesmo teste (EDGE-001), foi usado `context.clearCookies()`.

**O problema:** A aplicação é uma SPA que armazena o token de autenticação no `localStorage`, não em cookies. Limpar apenas cookies não encerra a sessão — o segundo `goto()` encontrava o usuário ainda autenticado, e o campo CPF/CNPJ não aparecia.

A correção exigiu adicionar `page.evaluate(() => localStorage.clear())` — um detalhe previsível para SPAs modernas.

**Regra:** Em SPAs, sempre combinar `clearCookies()` + `localStorage.clear()` para garantir sessão encerrada. Ou preferir testes independentes que não dependem de logout.

---

### Causa-raiz 4: Assertions geradas sem validar os perfis da aplicação

**O que foi feito:** O gerador assumiu que todos os perfis (Admin, N3, Multiplicador, Agricultor) teriam o elemento "Abrir chamado" visível após login.

**O problema:** Esse elemento é específico de alguns perfis. Sem navegar na aplicação para confirmar o comportamento de cada perfil, assertions foram criadas que não refletem a realidade.

**Regra:** Antes de gerar assertions pós-login para perfis diferentes do principal (Admin), navegar na aplicação ou consultar documentação para confirmar o que cada perfil vê no dashboard.

---

## Problemas de infraestrutura e permissão

### Infra 1: Subagente `playwright-test-planner` bloqueado pelas ferramentas MCP

**Etapa:** Passo 4 — Agente A (reprodução do fluxo via MCP).

**O que aconteceu:** O subagente do tipo `playwright-test-planner` foi instanciado para reproduzir o fluxo gravado navegando de verdade na aplicação. Ao tentar usar as ferramentas MCP do Playwright (`planner_setup_page`, `browser_navigate`, `browser_snapshot`, `browser_click`, etc.), todas foram bloqueadas por falta de permissão.

**Mensagem retornada pelo agente:**
> "As ferramentas MCP do Playwright estão sendo bloqueadas por permissão. Sem essas permissões, não consigo executar o fluxo de login interativamente pelo navegador."

**Impacto:** O `specs/login-flow.md` foi gerado a partir do código gravado (`login-recorded.ts`) em vez de uma navegação real. O documento ficou baseado em inferência, não em observação direta — podendo ter lacunas sobre o comportamento real da UI.

**Causa provável:** As ferramentas MCP do Playwright só estão disponíveis para subagentes dos tipos `playwright-test-generator`, `playwright-test-healer` e `playwright-test-planner` quando executados de forma direta (não como Task assíncrona em background). Executar via `Task` com `run_in_background: true` pode não repassar o contexto de permissões MCP corretamente.

**Workaround aplicado:** Foi instanciado um subagente `general-purpose` para gerar o `login-flow.md` com base no código gravado.

**Regra:** Subagentes que precisam de ferramentas MCP do Playwright não devem ser disparados como background tasks. Usar `run_in_background: false` ou executar diretamente na conversa principal.

---

### Infra 2: Subagente `Explore` em modo read-only — não conseguiu criar arquivo

**Etapa:** Passo 4 — Agente B (leitura de contexto da aplicação).

**O que aconteceu:** O subagente do tipo `Explore` foi instanciado para explorar os arquivos do projeto (`.env`, `test-data.ts`, `LoginPage.ts`) e salvar o contexto em `specs/login-context.md`. O agente explorou os arquivos com sucesso e gerou conteúdo rico, mas **não conseguiu criar o arquivo** porque o tipo `Explore` tem acesso somente leitura — não possui as ferramentas `Write` ou `Edit`.

**Mensagem retornada pelo agente:**
> "Não posso criar o arquivo `C:/projetos/automation-workflow-ia/specs/login-context.md` porque estou em modo READ-ONLY e não tenho permissão para escrever ou criar arquivos."

**Impacto:** O arquivo foi criado manualmente pela IA principal com o conteúdo retornado pelo agente — adicionando uma etapa extra não prevista no fluxo.

**Causa:** O tipo `Explore` tem ferramentas restritas por design (Glob, Grep, Read, LS — sem Write/Edit). A instrução de "salvar em arquivo" foi inválida para esse tipo de agente.

**Regra:** Para tarefas que exigem leitura **e** escrita de arquivos, usar `general-purpose` em vez de `Explore`. O `Explore` deve ser usado apenas para pesquisa e retorno de informações para a IA principal.

---

### Infra 3: Subagente `playwright-test-healer` cancelado antes de concluir

**Etapa:** Passo 9 — Tratamento de falhas.

**O que aconteceu:** O subagente `playwright-test-healer` foi instanciado para corrigir as 5 falhas. O usuário cancelou o tool use antes do agente concluir, o que encerrou a execução sem nenhum resultado.

**Impacto:** Tempo perdido (~7 minutos de espera + overhead de contexto) sem nenhuma correção aplicada. As correções foram feitas manualmente logo após o cancelamento.

**Causa:** O agente foi instanciado de forma inadequada para um problema simples (ver Causa-raiz 1). O cancelamento foi uma consequência correta do erro de julgamento anterior.

**Regra:** Antes de instanciar qualquer subagente para correção, avaliar se o problema pode ser resolvido diretamente em menos de 5 minutos. Se sim, corrigir diretamente.

---

### Infra 4: `npx playwright codegen` sem URL de destino — comportamento indefinido

**Etapa:** Passo 3 — Gravação do fluxo.

**O que aconteceu:** O comando `npx playwright codegen --output specs/login-recorded.ts` foi executado sem especificar a URL inicial. O browser abre em branco e depende do usuário navegar manualmente até a aplicação antes de iniciar a gravação.

**Impacto:** Potencial de confusão para usuários menos experientes com o Playwright Codegen. Neste caso funcionou porque o usuário navegou corretamente.

**Melhoria sugerida:** Passar a URL base como argumento quando conhecida:
```bash
npx playwright codegen --output specs/$FEATURE-recorded.ts https://stg.conexaobiotec.com.br
```

---

## Resumo de regras extraídas

| # | Categoria | Regra |
|---|---|---|
| 1 | Bugs | Se o log de erro já explica a causa, corrigir diretamente — sem subagente |
| 2 | Bugs | Ler o log completo e identificar todos os padrões antes de editar qualquer arquivo |
| 3 | Bugs | Em SPAs, usar `clearCookies()` + `localStorage.clear()` para encerrar sessão |
| 4 | Bugs | Validar o comportamento de cada perfil antes de gerar assertions pós-login |
| 5 | Bugs | Testes que dependem de logout dentro do mesmo caso são frágeis — preferir testes independentes |
| 6 | Infra | Subagentes com ferramentas MCP do Playwright não devem rodar como background tasks |
| 7 | Infra | Para tarefas com leitura + escrita de arquivos, usar `general-purpose` — não `Explore` |
| 8 | Infra | Antes de instanciar subagente para correção, avaliar se resolve em <5 min diretamente |
| 9 | Infra | Passar URL base no `playwright codegen` quando conhecida para evitar navegação manual desnecessária |
