# Regras de Qualidade — Automação de Testes QA

> Documento de referência para agentes autônomos e skills de IA atuando no ciclo de desenvolvimento de automação de testes.
> Versão: 2.1 | Atualizado em: 2026-03-02 | Alinhado com: ARCHITECTURE_3.md

---

## Propósito

Este documento define as regras de qualidade que devem ser aplicadas durante todo o ciclo de desenvolvimento de automação de testes com agentes autônomos. Cada regra existe para garantir que o código produzido seja seguro, rastreável, manutenível e confiável.

As regras estão organizadas em categorias e escritas em linguagem natural para que agentes autônomos possam consumir, interpretar e aplicar sem ambiguidade.

---

## Índice

1. [Estrutura e Arquitetura](#1-estrutura-e-arquitetura)
2. [Qualidade de Código](#2-qualidade-de-código)
3. [Qualidade dos Testes](#3-qualidade-dos-testes)
4. [Massa de Dados e Fixtures](#4-massa-de-dados-e-fixtures)
5. [Rastreabilidade e Documentação](#5-rastreabilidade-e-documentação)
6. [Segurança](#6-segurança)
7. [Git Flow e Controle de Versão](#7-git-flow-e-controle-de-versão)
8. [Pipeline e CI/CD](#8-pipeline-e-cicd)
9. [Regras Específicas para Agentes IA](#9-regras-específicas-para-agentes-ia)
10. [Regras de Integração com MCP Playwright e Claude Code](#10-regras-de-integração-com-mcp-playwright-e-claude-code)

---

## 1. Estrutura e Arquitetura

### 1.1 Page Object Model (Web)

Toda interação com a interface web deve ser encapsulada em um Page Object. Nunca escreva locators ou ações de UI diretamente dentro de um arquivo `.spec.ts`. Se uma tela nova precisar ser testada, uma nova classe deve ser criada em `src/web/pages/`, herdando de `BasePage`.

Cada Page Object deve seguir esta divisão interna: seletores definidos como getters `private` (usando `getByTestId` como primeira opção, depois `getByRole`, depois seletores de texto), e métodos públicos `async` que representam ações do usuário com nomes no idioma do negócio (por exemplo `realizarLogin`, `adicionarAoCarrinho`).

A propriedade `url` é obrigatória em toda subclasse de `BasePage` e deve conter apenas a rota relativa à `BASE_URL`, nunca a URL completa. O getter `url` da `BasePage` retorna `"/"` por padrão.

Não fazer assertions dentro do Page Object — quem faz assert é o teste. O Page Object devolve dados (`getOriginalPrice()`, `getInstallmentInfo()`) e o teste decide se está correto.

### 1.2 Service Layer (API)

Todo acesso à API deve ser feito por meio de uma classe de serviço que herda de `BaseService`. O arquivo de spec nunca deve conter chamadas diretas a `request.get()`, `request.post()` ou similares — isso é responsabilidade exclusiva dos serviços.

Cada serviço deve definir a propriedade `basePath` que representa o prefixo do recurso na API (por exemplo `/auth`, `/users`, `/products`). Métodos do serviço devem ter nomes semânticos de negócio: `list()`, `create()`, `remove()` — nunca `get()`, `post()`, `delete()` diretamente.

Serviços devem retornar `APIResponse` sem fazer parse — quem faz o assert e o parse é o teste. Parâmetros devem ser tipados com os models de `src/shared/models/`.

### 1.3 Camada Shared

Código que é compartilhado entre testes Web e API deve residir exclusivamente em `src/shared/`. Isso inclui:

- `models/` — interfaces e tipos TypeScript (contratos de dados)
- `factories/` — geração de dados de teste com Faker.js (Factory Pattern)
- `fixtures/` — fixtures do Playwright (injeção de dependência para Web e API)
- `helpers/` — utilitários compartilhados (env, config)

Nunca duplique uma interface de model entre as camadas. Se um tipo `User` existe em `src/shared/models/User.ts`, as outras camadas devem importá-lo de lá. A regra é Single Source of Truth: se a API muda o formato de `User`, você altera num lugar só e o compilador aponta todos os impactos.

### 1.4 Imports e Path Aliases

Use sempre os aliases de path definidos no `tsconfig.json` para importações entre camadas. Substitua caminhos relativos longos como `../../../shared/fixtures/base.fixture` pelo alias correspondente `@shared/fixtures/base.fixture`.

Os aliases definidos no projeto são: `@shared/*`, `@api/*`, `@web/*`, `@fixtures/*`, `@utils/*`, `@pages/*`. Nenhum arquivo dentro de `tests/` deve conter mais de dois níveis de `../` em seus imports.

### 1.5 Helpers por Camada

Cada camada tem sua pasta de helpers com responsabilidades claras:

- `src/api/helpers/` — assertions de response HTTP (`expectStatus`, `expectBodyContains`, `expectResponseTime`). Só usa se interage com `APIResponse`.
- `src/web/helpers/` — assertions de UI (`expectToastMessage`, `expectCurrentUrl`, `waitForLoadingSpinner`, `expectPriceFormat`). Só usa se depende de `Page`.
- `src/shared/helpers/` — utilitários compartilhados (`env.helper.ts` com Zod). Usado por todas as camadas.

Se um helper é específico de uma camada, ele vai na pasta da respectiva camada, nunca em `shared/`.

---

## 2. Qualidade de Código

### 2.1 TypeScript e Tipagem

Todo código novo deve ser escrito em TypeScript com tipagem explícita. Evite o uso de `any` — o ESLint gera `warn` para `@typescript-eslint/no-explicit-any`, mas o objetivo é eliminá-lo. Se o tipo é desconhecido, use `unknown` e faça a validação antes de usar.

Generics devem ser utilizados quando um método ou classe opera sobre múltiplos tipos (por exemplo `ApiResponse<T>`, `buildMany<T>()`, `PaginatedResponse<T>`). Use `Omit`, `Pick`, `Partial` para derivar tipos e evitar duplicação de interfaces.

Em models, o campo `id` deve ser opcional (`id?`) porque factories geram objetos sem id — o backend é quem atribui. Use union types (`"admin" | "user"`) para campos com valores fixos.

### 2.2 Nomenclatura

Nomes de arquivos de Page Object seguem PascalCase terminando com o sufixo do tipo: `LoginPage.ts`, `AuthService.ts`, `UserFactory.ts`. Arquivos de helper seguem camelCase com sufixo `.helper.ts`.

Métodos de ação em Page Objects usam verbos no infinitivo que descrevem a ação do usuário: `realizarLogin()`, `buscarProduto()`, `adicionarAoCarrinho()`. Getters de locator usam substantivos que identificam o elemento: `emailInput`, `submitButton`, `errorMessage`.

Nomenclatura de arquivos por camada:

- Web: `{Tela}Page.ts` → `LoginPage`, `HomePage`, `ProductDetailPage`, `SacolaPage`
- API: `{Recurso}Service.ts` → `AuthService`, `UserService`, `ProductService`

Descrições em `test.describe()` devem nomear a funcionalidade ou tela testada. Descrições em `test()` devem descrever o comportamento esperado no formato "deve [verbo] [resultado]", por exemplo: `deve exibir erro com credenciais inválidas`.

### 2.3 Lint e Formatação

Todo código submetido deve passar sem erros no ESLint com as regras do projeto (`eslint.config.mjs` — formato Flat Config, ESLint v9+). O Husky garante isso automaticamente no pre-commit via `lint-staged`, mas o agente não deve assumir que o hook vai corrigir — o código já deve estar conforme antes do commit.

Regras ESLint relevantes:

- `@typescript-eslint/no-unused-vars`: `error` (variáveis com `_` são permitidas via `argsIgnorePattern`)
- `@typescript-eslint/no-explicit-any`: `warn`
- `playwright/expect-expect`: `error` — reconhece helpers custom: `expect`, `expectStatus`, `expectBodyContains`, `expectResponseTime`

Formatação pelo Prettier (`.prettierrc`): semi `true`, aspas duplas, trailing comma, print width `100`, tab width `2`, end of line `lf`.

Execute `npm run lint` e `npm run format:check` antes de considerar qualquer tarefa de escrita de código como concluída. Se houver erros de lint que não podem ser corrigidos automaticamente, eles devem ser resolvidos manualmente e não suprimidos com `// eslint-disable`.

### 2.4 Sem Código Morto

Não deixe funções, variáveis, imports ou arquivos não utilizados no código. Se uma Page Object, Service ou Factory não tiver testes associados ainda, isso é aceitável; mas imports que não são usados dentro de um arquivo devem ser removidos. Nunca deixe `console.log` ou código de debug no código submetido.

---

## 3. Qualidade dos Testes

### 3.1 Independência e Isolamento

Cada teste deve ser completamente independente dos demais. Um teste não pode depender do estado deixado por outro teste anterior — isso inclui dados criados, cookies, sessões e estado de navegação.

No Playwright, use `test.beforeEach` para configuração e `afterEach` ou o ciclo de vida da fixture para limpeza.

### 3.2 Cobertura de Cenários

Todo fluxo crítico deve ter ao menos um teste de caminho feliz (cenário positivo) e ao menos um teste de caminho infeliz (cenário negativo, com dados inválidos, permissões ausentes ou estado incorreto).

A severidade dos testes deve ser declarada no Allure conforme o impacto do cenário: `blocker` para testes cujo fracasso impede a entrega, `critical` para fluxos principais do negócio, `normal` para fluxos secundários, `minor` para fluxos de menor impacto.

### 3.3 Asserções

Toda asserção deve ter uma mensagem descritiva ou estar acompanhada de um helper que já a inclui. Evite asserções genéricas como `expect(result).toBeTruthy()` quando o tipo do dado permite ser mais específico, como `expect(response.status).toBe(200)`.

Para testes de API, use sempre os helpers do projeto: `expectStatus()`, `expectBodyContains()`, `expectResponseTime()` e `expectSchema()`. Não escreva manualmente `expect(response.status()).toBe(200)` — isso já está encapsulado.

Para testes Web, use os helpers em `src/web/helpers/`: `expectToastMessage()`, `expectCurrentUrl()`, `expectPriceFormat()`, `expectParcelamentoInfo()`.

Para testes de API que retornam um corpo com contrato definido, `expectSchema()` com um schema Zod é obrigatório em pelo menos um teste por endpoint. Isso garante a validação de contrato contínua.

### 3.4 Determinismo

Testes devem ser determinísticos: executados nas mesmas condições, devem sempre produzir o mesmo resultado. Evite dependência de dados que mudam com o tempo (como "produto mais vendido hoje"), de ordem de execução, de valores aleatórios sem seed fixo, ou de timings implícitos (`sleep`, `pause`).

Quando precisar de dados dinâmicos, use as factories do projeto (`UserFactory.build()`, `ProductFactory.build()`, `ProductFactory.buildFeminino()`, `ProductFactory.buildOnSale()`). Quando precisar de dados conhecidos e estáveis, use o `testData` injetado via fixture, que já está organizado por ambiente.

### 3.5 Evidências e Rastreabilidade nos Testes

Testes web devem envolver todas as ações principais em `screenshotStep()`, que captura screenshot de sucesso e falha automaticamente e registra no Allure. Não use `allure.step()` diretamente em testes web — use o wrapper `screenshotStep()`.

Todo teste deve ter as anotações Allure obrigatórias preenchidas: `epic`, `feature`, `story`, `severity` e `description`. Essas anotações devem estar no início do teste, antes das ações.

### 3.6 Performance de Resposta

Para testes de API, sempre inclua `expectResponseTime(response, limite)` para endpoints críticos. O limite deve ser razoável para o ambiente testado: ambientes de HML podem ter latências maiores, mas produção deve ter tempos de resposta menores. Use como referência: endpoints de listagem em até 3000ms, endpoints de criação em até 5000ms.

### 3.7 Escopo do Teste por Arquivo

Nomes de arquivo de spec devem seguir o padrão da camada:

- API: `{recurso}.spec.ts` — um spec por grupo de endpoints (1 controller = 1 spec). Ex: `users.spec.ts`, `auth.spec.ts`, `products.spec.ts`
- Web: `{página}.spec.ts` — um spec por página ou fluxo. Ex: `login.spec.ts`, `product-detail.spec.ts`, `sacola.spec.ts`

Para testes API, o nome do teste segue: `{MÉTODO} {endpoint} - should {comportamento esperado}`. Para testes Web, o nome descreve o comportamento visual esperado.

---

## 4. Massa de Dados e Fixtures

### 4.1 Dados por Ambiente

Nunca escreva dados de teste diretamente no corpo de um teste (hardcode). Credenciais de usuário, termos de busca, categorias e CEPs conhecidos devem estar no arquivo de configuração de dados de teste (`test-data.config.ts` ou `testData.ts`), organizados por ambiente (`dev`, `hml`, `prd`).

Se um dado precisa existir no ambiente para o teste funcionar (por exemplo, um usuário pré-cadastrado), ele deve estar documentado em `testData` com o campo preenchido corretamente por ambiente.

### 4.2 Dados Dinâmicos com Factories

Para testes que precisam criar dados novos a cada execução, use exclusivamente as factories do projeto. Nunca escreva payloads com dados fixos repetidos em arquivos de spec.

Factories devem:

- Sempre aceitar `overrides: Partial<T>` para customização
- Usar `...overrides` por último para que sobrescreva os defaults
- Ter métodos de cenário quando um padrão de dados se repetir (`buildOnSale`, `buildFeminino`, `buildMasculino`, `buildOutOfStock`)
- Nunca colocar lógica de API ou browser — ela só gera objetos
- Usar `@faker-js/faker` para dados realistas e únicos

Se os dados necessários para um novo cenário não existem na factory, a factory deve ser estendida antes de criar os testes que dependem dela.

### 4.3 Fixtures do Playwright

Testes Playwright (Web e API) devem consumir Pages, Services e TestData exclusivamente via fixtures definidas em `base.fixture.ts`. Nunca instancie um Page Object ou Service dentro de um arquivo `.spec.ts` usando `new`.

Os testes importam `test` e `expect` de `src/shared/fixtures/base.fixture.ts`, nunca diretamente do `@playwright/test`.

Se um novo Page Object ou Service for criado, ele deve ser registrado na fixture antes de ser usado nos testes. A fixture garante o ciclo de vida correto: Pages recebem `{ page }`, Services recebem `{ request }`, e fixtures não usadas não são instanciadas (lazy).

---

## 5. Rastreabilidade e Documentação

### 5.1 Hierarquia Allure

A organização dos testes no Allure Report deve seguir a hierarquia: `epic → feature → story`. A regra é:

- **epic**: plataforma ou domínio principal — `"Web"`, `"API"`
- **feature**: funcionalidade sendo testada — `"Autenticação"`, `"Busca de Produtos"`, `"Carrinho"`
- **story**: cenário específico — `"Login com credenciais válidas"`, `"Busca retorna produtos"`

Essa hierarquia deve ser consistente entre todos os testes de um mesmo domínio. Não crie epics ou features novas sem verificar se já existe uma equivalente.

### 5.2 Rastreabilidade com User Stories

Todo branch de feature deve incluir o identificador da User Story ou Bug no nome: `feature/us-1234-descricao-curta` ou `hotfix/bug-5678-descricao-do-bug`. Commits devem referenciar o ID no final da mensagem: `Ref: US-1234`.

Quando o trabalho estiver associado a um card na ferramenta de gestão (Jira, Azure Boards, Kanbanize, etc.), o link para o card deve constar na descrição do Merge Request.

### 5.3 Mensagens de Commit

As mensagens de commit devem seguir o padrão Conventional Commits. Os tipos válidos para automação de testes são:

- `test:` para adição ou alteração de casos de teste
- `feat:` para novos Page Objects, Services, Helpers ou Factories
- `fix:` para correção de testes falhos
- `refactor:` para reestruturação sem mudança de comportamento
- `chore:` para atualizações de dependências, configuração, CI/CD
- `docs:` para atualização de README, CHANGELOG ou documentação interna

A mensagem deve descrever o que foi feito, não como. Ruim: `"add click method"`. Bom: `"feat: adiciona LoginPage com fluxo de autenticação"`.

### 5.4 Merge Request

Todo MR deve ter título claro e corpo preenchido com: descrição do que foi feito, qual User Story ou Bug originou a mudança, qual tipo de mudança é (novo teste, correção, refatoração), e se há alguma observação de configuração necessária.

O checklist de autor deve ser verificado antes de criar o MR. O checklist inclui confirmar que: os testes passam localmente, não há credenciais em código, os commits seguem Conventional Commits, o lint passa sem erros, e a rastreabilidade com o card está presente.

---

## 6. Segurança

### 6.1 Proibição de Credenciais em Código

Jamais escreva senhas, tokens, secrets, chaves de API ou qualquer dado sensível diretamente em arquivos de código TypeScript, JSON, YAML ou de configuração que sejam versionados. Isso inclui arquivos de spec, Page Objects, Services, configurações de CI e arquivos de configuração.

Credenciais de ambiente são fornecidas exclusivamente via arquivos `.env` locais que não são versionados (estão no `.gitignore`). A única exceção são dados de teste genéricos e não críticos em boilerplates de referência, que devem ser substituídos antes do uso em projetos reais.

### 6.2 Tokens de Cloud e Serviços Externos

Tokens de CI/CD e qualquer outra chave de serviço externo devem ser configurados como secrets no sistema de CI (GitHub Actions Secrets, GitLab CI Secrets, etc.) e referenciados como variáveis de ambiente nos workflows, nunca escritos diretamente nos arquivos YAML.

### 6.3 Dados Pessoais em Testes

Não use dados pessoais reais (CPFs reais de pessoas, e-mails reais de funcionários, números de cartão) em massa de dados de teste. Use dados gerados por factories (Faker.js + gerador de CPF válido) ou dados de teste fictícios e reconhecidamente falsos.

---

## 7. Git Flow e Controle de Versão

### 7.1 Estratégia de Branches

A branch `main` contém sempre o código em produção, estável e versionado. A branch `qa-stable` é a camada de integração e validação da equipe de QA. Nunca faça commit diretamente nessas duas branches.

Todo desenvolvimento novo começa criando uma branch a partir de `qa-stable`: `git checkout -b feature/us-XXXX-descricao qa-stable`. Ao concluir, o MR vai primeiro para `qa-stable`.

### 7.2 O Que Nunca Fazer

Nunca force-push (`git push --force`) em `main` ou `qa-stable`. Nunca faça rebase interativo em branches que já foram enviadas ao repositório remoto e compartilhadas com outros. Nunca ignore os hooks de pre-commit usando `--no-verify`.

### 7.3 Ciclo de Vida de Branches

Branches de feature devem ser criadas com escopo pequeno e focado (idealmente uma User Story ou uma funcionalidade coesa). Após o merge, a branch deve ser deletada. Branches abandonadas há mais de 30 dias sem atividade devem ser avaliadas e potencialmente removidas.

### 7.4 Sincronização

Antes de criar um MR, a branch de feature deve estar sincronizada com `qa-stable`. Use `git rebase qa-stable` para manter o histórico linear. Resolva conflitos localmente antes de enviar.

---

## 8. Pipeline e CI/CD

### 8.1 Condição para Merge

Nenhum Merge Request pode ser mergeado enquanto o pipeline de CI estiver com falha. A taxa de sucesso dos testes automatizados deve ser 100% antes do merge — zero falhas são toleradas como critério de aprovação.

### 8.2 Configuração de Retry

Os projetos já têm retry configurado para o ambiente de CI (`retries: 2` no Playwright). Isso é para lidar com instabilidades de ambiente, não para mascarar testes com problemas reais de implementação. Se um teste só passa na segunda tentativa consistentemente, ele tem um problema de estabilidade que deve ser corrigido.

### 8.3 Artifacts de Evidência

O pipeline deve sempre publicar os resultados de teste como artifacts: resultados Allure (`allure-results/`) e relatório JUnit (`junit-results/`). Esses artifacts são a evidência da execução e devem ser preservados por ao menos 30 dias.

### 8.4 Variáveis de Ambiente no CI

Cada ambiente de CI deve ter suas variáveis configuradas como secrets ou variáveis de ambiente protegidas na plataforma (GitHub Actions, GitLab CI, etc.). O pipeline não deve precisar de arquivos `.env` commitados — ele deve montar o ambiente a partir de variáveis injetadas.

### 8.5 Scripts Disponíveis

O pipeline e os desenvolvedores devem usar exclusivamente os scripts definidos no `package.json`:

- `npm test` — roda testes Playwright (API + Web)
- `npm run test:web` — apenas Web
- `npm run test:api` — apenas API
- `npm run test:headed` — testes Web com browser visível
- `npm run test:debug` — modo debug do Playwright
- `npm run lint` / `lint:fix` — análise estática
- `npm run format` / `format:check` — formatação

---

## 9. Regras Específicas para Agentes IA

Esta seção define as regras de comportamento para agentes de IA (como Claude Code) atuando no desenvolvimento de automação de testes dentro deste boilerplate.

### 9.1 Antes de Escrever Qualquer Código

O agente deve ler os arquivos relevantes antes de qualquer modificação:

- Antes de criar um novo Page Object: ler `BasePage.ts` e ao menos um Page Object existente (ex: `LoginPage.ts`, `ProductDetailPage.ts`)
- Antes de criar um Service: ler `BaseService.ts` e um Service concreto existente (ex: `ProductService.ts`)
- Antes de criar uma Factory: ler uma Factory existente (ex: `UserFactory.ts`, `ProductFactory.ts`)
- Antes de criar um teste: ler um arquivo de spec do mesmo tipo (web ou api)
- Antes de alterar a fixture: ler `base.fixture.ts` inteiro

O agente não deve assumir que conhece a estrutura atual — deve verificá-la lendo os arquivos, mesmo que a estrutura pareça óbvia.

### 9.2 Escopo das Mudanças

O agente deve fazer apenas o que foi pedido. Se a tarefa é "criar o teste de busca", o escopo é: criar o Page Object de busca (se não existir), adicionar a massa de dados necessária e criar o arquivo de spec. Não incluir refatorações não solicitadas, não alterar configurações de outros boilerplates, não "melhorar" código existente que não faz parte do escopo.

### 9.3 Verificações Antes de Concluir

Antes de declarar uma tarefa como concluída, o agente deve verificar mentalmente (ou executar, quando possível) a seguinte lista:

- O código novo passa no lint sem erros? (`npm run lint`)
- A formatação está correta? (`npm run format:check`)
- O TypeScript compila sem erros? (`npm run typecheck` quando disponível)
- Todas as anotações Allure obrigatórias estão presentes no(s) teste(s)?
- Não há credenciais, tokens ou dados sensíveis no código escrito?
- Os imports usam path aliases quando disponíveis?
- O novo Page Object, Service ou Factory está exportado no `index.ts` da pasta, quando aplicável?
- A fixture foi atualizada se um novo Page ou Service foi criado?
- O teste cobre ao menos um cenário positivo?

### 9.4 Commits Gerados por IA

Commits criados pelo agente devem seguir rigorosamente o padrão Conventional Commits. O agente deve incluir na mensagem o identificador da User Story quando fornecido. Commits devem ser granulares: um commit por unidade lógica de trabalho (um Page Object, um Service, um conjunto de testes de uma feature).

O agente nunca deve criar commits em `main` ou `qa-stable`. Se estiver trabalhando em uma branch de feature, deve verificar qual é a branch ativa antes de commitar.

### 9.5 Operações Destrutivas

O agente deve pedir confirmação explícita antes de: deletar arquivos existentes, modificar a estrutura de fixtures compartilhadas (o que pode quebrar outros testes), alterar configurações de ambiente (`playwright.config.ts`, `tsconfig.json`), e modificar o `package.json`.

Para essas operações, o agente deve descrever o que vai fazer, por que, e aguardar aprovação — mesmo que pareça necessário para completar a tarefa.

### 9.6 Quando Há Ambiguidade

Se a tarefa descrita não tem informações suficientes para seguir os padrões do projeto (por exemplo, "criar testes de checkout" sem especificar qual endpoint ou qual fluxo), o agente deve perguntar antes de escrever código. É melhor fazer uma pergunta do que criar código que precisa ser descartado.

### 9.7 Identificação de Violações de Regras

Quando o agente perceber que o código existente viola alguma das regras deste documento, ele deve reportar a violação ao usuário mas não deve corrigi-la automaticamente, a menos que seja parte explícita da tarefa solicitada. O agente não deve usar uma tarefa pequena como oportunidade para refatorar silenciosamente o restante do projeto.

---

## 10. Regras de Integração com MCP Playwright e Claude Code

Esta seção define regras específicas para o uso do Claude Code com MCP Playwright no fluxo de automação de testes.

### 10.1 Fluxo de Trabalho com MCP Playwright

Quando o agente Claude Code usar o MCP Playwright para gerar ou validar testes:

1. Deve primeiro navegar na aplicação para entender a estrutura real da tela antes de escrever seletores
2. Deve priorizar `data-testid` e roles ARIA capturados do DOM real, nunca inventar seletores
3. Deve validar que os seletores encontrados são estáveis (não contêm IDs dinâmicos, índices frágeis ou classes CSS geradas)
4. Deve capturar evidências (screenshots) dos elementos encontrados para documentar o mapeamento

### 10.2 Geração de Testes Assistida por IA

Quando o agente gerar testes automaticamente:

- O teste gerado deve seguir 100% dos padrões do quality-rules (este documento)
- O agente deve declarar explicitamente quais arquivos foram criados/modificados e o motivo
- Testes gerados por IA devem ser marcados com o tag Allure `@ai-generated` para rastreabilidade
- O agente nunca deve gerar testes que fazem login com credenciais hardcoded — deve usar fixtures e `testData`

### 10.3 Validação Pós-Geração

Após gerar código, o agente deve:

1. Executar `npm run lint` e corrigir qualquer erro
2. Executar `npm run format:check` e formatar se necessário
3. Verificar se o teste compila (`npx tsc --noEmit`)
4. Quando possível, executar o teste em modo headed para validação visual

### 10.4 Limites do Agente

O agente não deve:

- Gerar mais de 5 specs em uma única sessão sem revisão humana intermediária
- Alterar a arquitetura do boilerplate (criar pastas novas, mudar padrões de herança)
- Tomar decisões sobre quais cenários de negócio são mais importantes — isso é responsabilidade do QA humano
- Executar testes contra ambientes de produção sem autorização explícita

---

## Apêndice A: De-Para — Checklist de Code Review × Regras

Esta tabela mapeia cada item do checklist do Git Flow Guide para as regras correspondentes neste documento.

| Item do Checklist (Git Flow Guide) | Regra Correspondente |
|---|---|
| Código segue os padrões de nomenclatura | Regras 2.2 e 2.3 |
| Nenhuma credencial hardcoded | Regra 6.1 |
| Commits seguem Conventional Commits | Regra 5.3 |
| Lint e formatação passando | Regra 2.3 |
| Testes cobrem cenários positivos e negativos | Regra 3.2 |
| Testes são determinísticos (sem dependência de ordem) | Regra 3.4 |
| Asserções são específicas e com mensagens claras | Regra 3.3 |
| Nenhum dado sensível exposto | Regras 6.1, 6.2, 6.3 |
| Pipeline CI passou com 100% de testes | Regra 8.1 |
| Nenhum conflito de merge | Regra 7.4 |
| Código legível, sem duplicações | Regras 1.3, 2.4 |
| Rastreabilidade com card (US/Bug ID) | Regra 5.2 |
| MR tem descrição completa | Regra 5.4 |
| Branch criada a partir de `qa-stable` | Regra 7.1 |
| Branch sincronizada antes do MR | Regra 7.4 |
| Evidências e relatórios gerados | Regras 3.5, 8.3 |
| Documentação atualizada | Regra 5.4 |
| Sem `console.log` ou código de debug | Regra 2.4 |
| Validação de schema para endpoints de API | Regra 3.3 |
| Massa de dados usa fixtures/factories, não hardcode | Regras 4.1, 4.2 |

---

## Apêndice B: Checklist para Adicionar uma Nova Entidade

Ao adicionar uma nova entidade (ex: `Order`), siga estes passos na ordem:

| # | Artefato | Caminho | Obrigatório |
|---|---|---|---|
| 1 | Model | `src/shared/models/Order.ts` | Sim |
| 2 | Factory | `src/shared/factories/OrderFactory.ts` com `build()` e `buildMany()` | Sim |
| 3 | Service (se tiver API) | `src/api/services/OrderService.ts` estendendo `BaseService` | Se aplicável |
| 4 | Page (se tiver UI Web) | `src/web/pages/OrdersPage.ts` estendendo `BasePage` | Se aplicável |
| 5 | Fixture | Registrar novo service/page em `src/shared/fixtures/base.fixture.ts` | Se criou service ou page |
| 6 | Tests API | `tests/api/orders.spec.ts` | Se criou service |
| 7 | Tests Web | `tests/web/orders.spec.ts` | Se criou page |

---

## Apêndice C: Novas Regras Propostas

As regras a seguir foram identificadas como gaps no processo atual e são propostas como adições ao fluxo de qualidade:

### NR-01: Validação de Contrato Mínima por Endpoint

Todo endpoint de API que é coberto por um Service deve ter ao menos um teste que valide o schema de resposta com Zod. Atualmente, o boilerplate não tem schemas Zod implementados — isso deve ser corrigido.

### NR-02: Nomenclatura de Specs Ligada à Feature

Arquivos de spec devem ter nomes que reflitam diretamente a funcionalidade testada e o contexto, seguindo o padrão `[recurso].[contexto].spec.ts`. Por exemplo: `auth.login.spec.ts`, `products.list.spec.ts`. Isso facilita a rastreabilidade e a busca por arquivo.

### NR-03: Limite de Linhas por Spec

Um arquivo de spec não deve ultrapassar 200 linhas. Se ultrapassar, é sinal de que ele cobre funcionalidades demais e deve ser dividido. Specs menores são mais fáceis de manter, debugar e revisar.

### NR-04: Revisão Obrigatória de Specs Gerados por IA

Quando um agente de IA gerar um arquivo de spec completo, um humano deve revisar obrigatoriamente: se as asserções fazem sentido para o negócio, se os cenários negativos são realistas, e se as mensagens de erro esperadas estão corretas para o ambiente. IA pode cometer erros silenciosos em asserções ("deve retornar 200" quando o correto é 201).

### NR-05: Log de Ações do Agente

Quando o agente de IA realizar mudanças em múltiplos arquivos em uma única sessão, deve criar uma entrada no commit message body listando os arquivos criados/modificados e o motivo. Isso facilita a revisão humana do MR.

### NR-06: Proteção de Testes de Produção

Testes com `ENV=prd` nunca devem realizar operações de escrita (POST, PUT, PATCH, DELETE) em produção sem uma flag explícita de autorização. O padrão é: testes de produção são somente leitura e de monitoramento. Qualquer desvio disso deve ser justificado e aprovado.

### NR-07: Consistência de Idioma

Todo código de automação de testes deve ser escrito em português para: nomes de métodos de negócio em Page Objects, descrições de `test.describe()` e `test()`, labels Allure (feature, story, description), e comentários em código. Nomes de variáveis, classes, interfaces e tipos seguem convenções técnicas em inglês (camelCase, PascalCase). Misturar idiomas dentro de um mesmo contexto (dois métodos na mesma classe, um em pt e outro en) é uma violação.

### NR-08: Teardown Explícito para Dados Criados

Quando um teste cria dados via API (usando um Service em um `beforeEach` ou diretamente no teste), deve haver um `afterEach` ou equivalente que remove esses dados ao final, para não contaminar o ambiente de teste. Se o endpoint de remoção não existir, o dado deve ser criado com identificador único (usando Faker) para minimizar o impacto.

### NR-09: Validação de Ambiente com Zod Obrigatória

Toda variável de ambiente utilizada pelo framework deve ser validada via Zod no `env.helper.ts` antes da execução dos testes. Fail-fast é melhor que um erro misterioso no meio da execução. Se uma nova variável de ambiente for adicionada (ex: novo serviço externo, novo endpoint), o schema Zod deve ser atualizado antes de commitar.

### NR-10: Quarentena de Testes Instáveis

Testes que falham intermitentemente (flaky) devem ser isolados em uma tag `@quarantine` no Allure e movidos para uma suite separada. Eles continuam executando no CI para monitoramento, mas não bloqueiam o merge. O time tem um SLA de 5 dias úteis para corrigir ou remover um teste em quarentena.

### NR-11: Métricas de Qualidade por Sprint

A cada sprint, as seguintes métricas devem ser calculadas e reportadas:

- Taxa de sucesso dos testes (target: >95%)
- Taxa de flakiness (target: <5%)
- Cobertura de cenários por funcionalidade
- Tempo médio de execução da suite completa
- Quantidade de testes gerados por IA vs humano
- Taxa de rejeição de testes gerados por IA no code review

### NR-12: Proibição de Waits Estáticos

Nunca use `page.waitForTimeout()` ou qualquer forma de wait estático em testes. Use waits explícitos: `waitFor({ state: 'visible' })`, `waitForLoadingSpinner()`, `waitForURL()`. Waits estáticos são a principal causa de testes flaky e lentidão.

### NR-13: Limite de Retries no Código

Nenhum teste deve ter retry individual (`test.describe.configure({ retries: N })`) diferente da configuração global do projeto. Se um teste precisa de retry individual, é sinal de instabilidade que deve ser corrigida, não mascarada. A configuração global (`retries: 2` no CI, `retries: 0` local) é a única permitida.

### NR-14: Documentação de Seletores Frágeis

Quando o agente ou desenvolvedor encontrar uma tela sem `data-testid` disponíveis e precisar usar seletores CSS ou XPath, deve criar um comentário `// TODO: Solicitar data-testid para [elemento]` e abrir um card de debt técnico na ferramenta de gestão do projeto. Seletores frágeis são tolerados temporariamente, mas não permanentemente.

### NR-15: Segregação de Responsabilidade no Teste

Um teste deve validar exatamente um comportamento. Se um teste web precisa fazer login como pré-condição, o login deve ser feito via API (usando um Service no `beforeEach`) e não via UI, a menos que o login seja o comportamento sendo testado. Isso reduz o tempo de execução e isola falhas.

### NR-16: Versionamento de Schemas Zod

Schemas Zod usados para validação de contrato devem ser versionados junto com os models em `src/shared/models/`. Se um endpoint muda o formato de resposta, o schema deve ser atualizado antes dos testes — e se os testes começam a falhar sem mudança de código, é um indício de mudança de contrato não comunicada.

### NR-17: Auditoria de Cobertura IA

Toda funcionalidade coberta por testes gerados com IA deve ter uma revisão trimestral para verificar se os cenários ainda são relevantes, se as asserções estão corretas e se novos cenários de negócio foram adicionados pela equipe humana. A IA gera a base, mas a inteligência de negócio vem do QA humano.

---

## Apêndice D: Glossário de Termos

| Termo | Definição |
|---|---|
| Page Object | Classe que encapsula interação com uma página web (Playwright) |
| Service | Classe que encapsula chamadas HTTP a uma API |
| Factory | Classe que gera dados de teste dinâmicos com Faker.js |
| Fixture | Mecanismo de injeção de dependência do Playwright |
| BasePage | Classe abstrata base para Page Objects web |
| BaseService | Classe abstrata base para Services de API |
| MCP Playwright | Model Context Protocol para integração de Claude Code com Playwright |
| Flaky test | Teste que falha intermitentemente sem mudança de código |
| Quarentena | Estado temporário para testes instáveis sob investigação |