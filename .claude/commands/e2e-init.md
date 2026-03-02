---
description: Inicializa a arquitetura completa do projeto de automação E2E
---

# E2E Init — Scaffold do Projeto

Inicialize a arquitetura completa do projeto de automação E2E executando os passos abaixo.

---

## Passo 1: Configurar permissões e verificar pré-requisitos

### 1.1 — Configurar permissões globais para operação autônoma

Execute via Bash para gravar as permissões no settings global do Claude Code (`~/.claude/settings.json`). Isso garante que todos os projetos rodem sem pedir aprovação para cada ação:

```bash
node -e "
const fs = require('fs'), os = require('os'), path = require('path');
const f = path.join(os.homedir(), '.claude', 'settings.json');
const d = path.dirname(f);
if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
const s = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
s.permissions = s.permissions || {};
const cur = s.permissions.allow || [];
const add = [
  'Bash(node:*)','Bash(npm:*)','Bash(npx:*)','Bash(git:*)','Bash(mkdir:*)',
  'Bash(cp:*)','Bash(mv:*)','Bash(cat:*)','Bash(grep:*)','Bash(ls:*)',
  'Bash(echo:*)','Bash(claude:*)','Bash(BASE_URL:*)',
  'mcp__playwright-test__browser_navigate','mcp__playwright-test__browser_click',
  'mcp__playwright-test__browser_snapshot','mcp__playwright-test__browser_type',
  'mcp__playwright-test__browser_evaluate','mcp__playwright-test__browser_wait_for',
  'mcp__playwright-test__browser_take_screenshot','mcp__playwright-test__browser_hover',
  'mcp__playwright-test__browser_select_option','mcp__playwright-test__browser_fill_form',
  'mcp__playwright-test__browser_handle_dialog','mcp__playwright-test__browser_navigate_back',
  'mcp__playwright-test__browser_press_key','mcp__playwright-test__browser_console_messages',
  'mcp__playwright-test__browser_network_requests','mcp__playwright-test__browser_file_upload',
  'mcp__playwright-test__browser_drag',
  'mcp__playwright-test__test_run','mcp__playwright-test__test_debug','mcp__playwright-test__test_list',
  'mcp__playwright-test__generator_setup_page','mcp__playwright-test__generator_read_log',
  'mcp__playwright-test__generator_write_test','mcp__playwright-test__planner_setup_page',
  'mcp__playwright-test__planner_save_plan',
  'mcp__mcp-e2e__run_e2e_tests','mcp__mcp-e2e__collect_metrics','mcp__mcp-e2e__check_quality_gates'
];
add.forEach(p => { if (!cur.includes(p)) cur.push(p); });
s.permissions.allow = cur;
fs.writeFileSync(f, JSON.stringify(s, null, 2));
console.log('Permissões globais configuradas em: ' + f);
"
```

> ⚠️ **Reinício necessário:** As permissões globais só entram em vigor após reiniciar o Claude Code. O `/e2e-init` pode continuar — mas o fluxo totalmente autônomo só funcionará na próxima sessão.

### 1.2 — Verificar pré-requisitos

Use Bash para verificar:
```bash
node --version   # Requer >= 18
npm --version
git --version
```

Se algum estiver faltando, informe o usuário e pare.

### 1.3 — Remover MCP conflitante

```bash
claude mcp remove playwright --scope user 2>/dev/null || true
```

> Evita conflito entre `@playwright/mcp` (global) e `playwright-test` (projeto).

---

## Passo 2: Inicializar package.json e instalar dependências

Se `package.json` não existir, inicialize:
```bash
npm init -y
```

Instale as dependências:

```bash
# Core: Playwright + TypeScript
npm install --save-dev @playwright/test typescript @types/node dotenv tsx

# Dados de teste
npm install --save-dev @faker-js/faker

# Validação de variáveis de ambiente
npm install zod

# Relatórios Allure (Regra 3.5 e 8.3)
npm install --save-dev allure-playwright @allure-js/commons

# Qualidade de código: ESLint + Prettier + Husky
npm install --save-dev eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-playwright eslint-config-prettier prettier lint-staged husky

# Instalar browser
npx playwright install chromium
```

---

## Passo 2.5: Registrar MCPs do projeto

Registre os dois MCPs necessários para o fluxo automatizado:

```bash
claude mcp add playwright-test -s project -- npx playwright run-test-mcp-server
claude mcp add mcp-e2e -s project -- npx tsx src/index.ts
```

> ⚠️ **Reinício necessário:** MCPs registrados neste passo só ficam ativos após reiniciar o Claude Code. O `/e2e-init` pode continuar normalmente — mas antes de rodar `/e2e-feature`, o usuário precisará reiniciar a sessão.

Informe o usuário:
> "MCPs registrados. Lembre de **reiniciar o Claude Code** ao final do init para ativá-los."

---

## Passo 3: Criar estrutura de diretórios

Crie os seguintes diretórios (use Bash com `mkdir -p`):

```bash
mkdir -p src/api/services
mkdir -p src/api/helpers
mkdir -p src/web/pages
mkdir -p src/web/helpers
mkdir -p src/shared/models
mkdir -p src/shared/factories
mkdir -p src/shared/fixtures
mkdir -p src/shared/helpers
mkdir -p tests/api
mkdir -p tests/web
mkdir -p specs/bugs
mkdir -p reports
mkdir -p .github/workflows
```

Estrutura resultante:
```
src/
├── api/
│   ├── services/     → clientes HTTP (BaseService + services concretos)
│   └── helpers/      → utilitários exclusivos de API
├── web/
│   ├── pages/        → Page Objects (BasePage + pages concretas)
│   └── helpers/      → utilitários exclusivos de Web/UI
└── shared/
    ├── models/       → interfaces TypeScript (contratos de dados)
    ├── factories/    → geração de dados de teste (Factory Pattern)
    ├── fixtures/     → injeção de dependência do Playwright
    └── helpers/      → utilitários compartilhados (env, config)
tests/
├── api/              → specs de testes de API
└── web/              → specs de testes Web/UI
specs/bugs            → bugs documentados durante os testes
```

---

## Passo 4: Criar playwright.config.ts

Crie o arquivo `playwright.config.ts` na raiz:

```typescript
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'junit-results/results.xml' }],
    ['allure-playwright', { resultsDir: 'allure-results' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'web-chromium',
      use: { ...devices['Desktop Chrome'] },
      testDir: './tests/web',
    },
    {
      name: 'api',
      use: {
        extraHTTPHeaders: {
          Accept: 'application/json',
        },
      },
      testDir: './tests/api',
    },
  ],
});
```

---

## Passo 5: Criar tsconfig.json

Crie ou atualize `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["src/shared/*"],
      "@web/*": ["src/web/*"],
      "@api/*": ["src/api/*"]
    }
  },
  "include": [
    "src/api/**/*.ts",
    "src/web/**/*.ts",
    "src/shared/**/*.ts",
    "tests/api/**/*.ts",
    "tests/web/**/*.ts",
    "playwright.config.ts"
  ],
  "exclude": ["node_modules", "dist"]
}
```

---

## Passo 6: Criar GitHub Actions workflow

Crie `.github/workflows/e2e.yml`:

```yaml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  web:
    name: Web Tests
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
      - name: Run web tests
        run: npx playwright test --project=web-chromium
        env:
          BASE_URL: ${{ secrets.BASE_URL }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-web
          path: playwright-report/
          retention-days: 30
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: allure-results-web
          path: allure-results/
          retention-days: 30
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: junit-results-web
          path: junit-results/
          retention-days: 30

  api:
    name: API Tests
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Run API tests
        run: npx playwright test --project=api
        env:
          BASE_URL: ${{ secrets.BASE_URL }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-api
          path: playwright-report/
          retention-days: 30
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: allure-results-api
          path: allure-results/
          retention-days: 30
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: junit-results-api
          path: junit-results/
          retention-days: 30
```

---

## Passo 7: Criar arquivos base da arquitetura

### 7.1 — Validador de variáveis de ambiente

Crie `src/shared/helpers/env.helper.ts`:

```typescript
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Adapte o schema conforme os perfis e variáveis da aplicação.
// Este exemplo usa autenticação por CPF + senha com 12 perfis.
const envSchema = z.object({
  BASE_URL: z.string().url().default('http://localhost:3000'),

  // Credenciais por perfil
  ADMIN_CPF:         z.string().optional(),
  ADMIN_PASSWORD:    z.string().optional(),
  N1_CPF:            z.string().optional(),
  N1_PASSWORD:       z.string().optional(),
  N2_CPF:            z.string().optional(),
  N2_PASSWORD:       z.string().optional(),
  N3_CPF:            z.string().optional(),
  N3_PASSWORD:       z.string().optional(),
  AUDITOR_CPF:       z.string().optional(),
  AUDITOR_PASSWORD:  z.string().optional(),
  AGRICULTOR_CPF:    z.string().optional(),
  AGRICULTOR_PASSWORD: z.string().optional(),
  MULTIPLICADOR_CPF: z.string().optional(),
  MULTIPLICADOR_PASSWORD: z.string().optional(),
  DISTRIBUIDOR_CPF:  z.string().optional(),
  DISTRIBUIDOR_PASSWORD: z.string().optional(),
  B2B_CPF:           z.string().optional(),
  B2B_PASSWORD:      z.string().optional(),
  AVALIADOR_CPF:     z.string().optional(),
  AVALIADOR_PASSWORD: z.string().optional(),
  RTVS_CPF:          z.string().optional(),
  RTVS_PASSWORD:     z.string().optional(),
  RTVI_CPF:          z.string().optional(),
  RTVI_PASSWORD:     z.string().optional(),

  // Integração Azure DevOps (opcional)
  AZURE_DEVOPS_ORG:     z.string().optional(),
  AZURE_DEVOPS_PROJECT: z.string().optional(),
  AZURE_DEVOPS_PAT:     z.string().optional(),

  // Repositório de código-fonte da aplicação (opcional)
  SOURCE_REPO_PATH: z.string().optional(),
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`Variáveis de ambiente inválidas:\n${errors}`);
  }

  return result.data;
}

export const env = loadEnv();
```

### 7.2 — Model de usuário

Crie `src/shared/models/User.ts`:

```typescript
export interface User {
  id?: string;
  name: string;
  email?: string;
  cpf?: string;
  password: string;
  role: string;
}

// Campo único que aceita CPF ou e-mail (conforme a aplicação)
export interface LoginCredentials {
  cpfOrEmail: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, 'password'>;
}

// Perfis disponíveis na aplicação
export type UserProfile =
  | 'admin' | 'n1' | 'n2' | 'n3'
  | 'auditor' | 'agricultor' | 'multiplicador' | 'distribuidor'
  | 'b2b' | 'avaliador' | 'rtvs' | 'rtvi';
```

### 7.3 — Factory de usuário

Crie `src/shared/factories/UserFactory.ts`:

```typescript
import { faker } from '@faker-js/faker';
import { User } from '../models/User';

function generateCpf(): string {
  const digits = Array.from({ length: 9 }, () => faker.number.int({ min: 0, max: 9 }));

  let sum = digits.reduce((acc, d, i) => acc + d * (10 - i), 0);
  let rem = (sum * 10) % 11;
  const d1 = rem === 10 || rem === 11 ? 0 : rem;
  digits.push(d1);

  sum = digits.reduce((acc, d, i) => acc + d * (11 - i), 0);
  rem = (sum * 10) % 11;
  const d2 = rem === 10 || rem === 11 ? 0 : rem;
  digits.push(d2);

  return `${digits.slice(0, 3).join('')}.${digits.slice(3, 6).join('')}.${digits.slice(6, 9).join('')}-${digits.slice(9, 11).join('')}`;
}

export class UserFactory {
  static build(overrides: Partial<User> = {}): User {
    return {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      cpf: generateCpf(),
      password: faker.internet.password({ length: 12 }),
      role: 'user',
      ...overrides,
    };
  }

  static buildMany(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }

  static buildAdmin(overrides: Partial<User> = {}): User {
    return this.build({ role: 'admin', ...overrides });
  }
}
```

### 7.4 — Fixture base (injeção de dependência)

Crie `src/shared/fixtures/base.fixture.ts`:

```typescript
import { test as base, expect } from '@playwright/test';

// Este arquivo é o ponto central de composição do framework.
// Adicione aqui novas fixtures conforme Page Objects e Services forem criados.
//
// Exemplo de como extender:
//
// import { LoginPage } from '../../web/pages/LoginPage';
// import { AuthService } from '../../api/services/AuthService';
//
// type Pages = { loginPage: LoginPage };
// type Services = { authService: AuthService };
//
// export const test = base.extend<Pages & Services>({
//   loginPage: async ({ page }, use) => { await use(new LoginPage(page)); },
//   authService: async ({ request }, use) => { await use(new AuthService(request)); },
// });
//
// Os testes importam `test` e `expect` daqui, nunca do `@playwright/test` diretamente.

export const test = base;
export { expect };
```

### 7.5 — BaseService (clientes HTTP)

Crie `src/api/services/BaseService.ts`:

```typescript
import { APIRequestContext, APIResponse } from '@playwright/test';

export abstract class BaseService {
  constructor(protected readonly request: APIRequestContext) {}

  protected abstract get basePath(): string;

  protected async get(path = '', params?: Record<string, string>): Promise<APIResponse> {
    return this.request.get(`${this.basePath}${path}`, { params });
  }

  protected async post(path = '', data?: unknown): Promise<APIResponse> {
    return this.request.post(`${this.basePath}${path}`, { data });
  }

  protected async put(path: string, data?: unknown): Promise<APIResponse> {
    return this.request.put(`${this.basePath}${path}`, { data });
  }

  protected async patch(path: string, data?: unknown): Promise<APIResponse> {
    return this.request.patch(`${this.basePath}${path}`, { data });
  }

  protected async delete(path: string): Promise<APIResponse> {
    return this.request.delete(`${this.basePath}${path}`);
  }
}
```

### 7.6 — BasePage (Page Objects)

Crie `src/web/pages/BasePage.ts`:

```typescript
import { Page, Locator } from '@playwright/test';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  protected get url(): string {
    return '/';
  }

  async navigate() {
    await this.page.goto(this.url);
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  protected getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  protected getByRole(
    role: Parameters<Page['getByRole']>[0],
    options?: Parameters<Page['getByRole']>[1],
  ): Locator {
    return this.page.getByRole(role, options);
  }

  protected getByText(text: string): Locator {
    return this.page.getByText(text);
  }

  protected getByLabel(label: string): Locator {
    return this.page.getByLabel(label);
  }

  protected getByPlaceholder(placeholder: string): Locator {
    return this.page.getByPlaceholder(placeholder);
  }
}
```

### 7.7 — Helpers de API

Crie `src/api/helpers/api.helper.ts`:

```typescript
import { APIResponse, expect } from '@playwright/test';

export async function expectStatus(response: APIResponse, status: number) {
  expect(response.status()).toBe(status);
}

export async function expectBodyContains(response: APIResponse, key: string) {
  const body = await response.json();
  expect(body).toHaveProperty(key);
}

export async function expectResponseTime(response: APIResponse, maxMs: number) {
  const timing = response.headers()['x-response-time'];
  if (timing) {
    expect(parseInt(timing, 10)).toBeLessThanOrEqual(maxMs);
  }
}
```

### 7.8 — Helpers de Web

Crie `src/web/helpers/web.helper.ts`:

```typescript
import { Page, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

/**
 * Executa uma ação dentro de um step Allure com screenshot automático.
 * Use este helper em vez de allure.step() diretamente nos testes web (Regra 3.5).
 *
 * Captura screenshot antes e após a ação, e em caso de falha.
 */
export async function screenshotStep(
  page: Page,
  stepName: string,
  action: () => Promise<void>,
): Promise<void> {
  await allure.step(stepName, async () => {
    try {
      await action();
      const screenshot = await page.screenshot({ fullPage: false });
      await allure.attachment(`${stepName} — sucesso`, screenshot, { contentType: 'image/png' });
    } catch (error) {
      const screenshot = await page.screenshot({ fullPage: false });
      await allure.attachment(`${stepName} — falha`, screenshot, { contentType: 'image/png' });
      throw error;
    }
  });
}

export async function expectToastMessage(page: Page, message: string) {
  const toast = page.locator('[data-testid="toast-message"]');
  await expect(toast).toBeVisible();
  await expect(toast).toContainText(message);
}

export async function expectCurrentUrl(page: Page, path: string) {
  await page.waitForURL(`**${path}`);
  expect(page.url()).toContain(path);
}

export async function waitForLoadingSpinner(page: Page) {
  const spinner = page.locator('[data-testid="loading-spinner"]');
  await spinner.waitFor({ state: 'hidden', timeout: 10000 });
}

export async function clearSession(page: Page) {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}
```

---

## Passo 7.5: Configurar qualidade de código

### ESLint (flat config)

Crie `eslint.config.mjs`:

```javascript
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import playwrightPlugin from 'eslint-plugin-playwright';
import prettierConfig from 'eslint-config-prettier';

export default [
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { project: './tsconfig.json' },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  {
    files: ['tests/api/**/*.ts', 'tests/web/**/*.ts'],
    plugins: { playwright: playwrightPlugin },
    rules: {
      ...playwrightPlugin.configs['flat/recommended'].rules,
      'playwright/expect-expect': ['error', {
        assertFunctionNames: ['expect', 'expectStatus', 'expectBodyContains', 'expectResponseTime'],
      }],
    },
  },
  prettierConfig,
];
```

### Prettier

Crie `.prettierrc`:

```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "endOfLine": "lf"
}
```

Crie `.prettierignore`:

```
node_modules
dist
test-results
playwright-report
allure-results
package-lock.json
```

### Husky + lint-staged

```bash
npx husky init
echo "npx lint-staged" > .husky/pre-commit
```

Adicione `lint-staged` ao `package.json`:

```bash
npm pkg set lint-staged['*.ts']='["eslint --fix", "prettier --write"]' --json
```

### Scripts no package.json

```bash
npm pkg set scripts.test="playwright test"
npm pkg set scripts.test:web="playwright test --project=web-chromium"
npm pkg set scripts.test:api="playwright test --project=api"
npm pkg set scripts.test:headed="playwright test --project=web-chromium --headed"
npm pkg set scripts.test:debug="playwright test --debug"
npm pkg set scripts.lint="eslint ."
npm pkg set scripts.lint:fix="eslint . --fix"
npm pkg set scripts.format="prettier --write ."
npm pkg set scripts.format:check="prettier --check ."
npm pkg set scripts.typecheck="tsc --noEmit"
npm pkg set scripts.prepare="husky"
```

### .gitignore

Crie ou atualize `.gitignore`:

```
node_modules/
dist/
playwright-report/
test-results/
allure-results/
junit-results/
reports/
.env
*.local
```

---

## Passo 8: Configurar variáveis de ambiente

### 8.0 — Ler defaults do projeto framework

Execute para encontrar o `.env` do projeto `mcp-e2e` (framework) via symlink e usar como padrão:

```bash
node -e "
const fs = require('fs'), path = require('path'), os = require('os');
try {
  const link = path.join(os.homedir(), '.claude', 'commands');
  const target = fs.readlinkSync(link);
  const abs = path.isAbsolute(target) ? target : path.join(os.homedir(), '.claude', target);
  const envPath = path.join(path.dirname(path.dirname(abs)), '.env');
  if (fs.existsSync(envPath)) {
    console.log(fs.readFileSync(envPath, 'utf8'));
  } else {
    console.log('NOT_FOUND');
  }
} catch(e) { console.log('NOT_FOUND'); }
"
```

Se retornar conteúdo (não `NOT_FOUND`), use os valores encontrados como padrão para as perguntas abaixo. O usuário pode confirmar ou sobrescrever cada um.

### 8.1 — Perguntar a URL base

Pergunte ao usuário:
> "Qual a URL base da aplicação que será testada?
> 1. Já está configurada no .env (BASE_URL) — pular esta etapa
> 2. Informar agora"

**Se opção 1:** verifique se o `.env` já existe com `BASE_URL` preenchida. Se sim, use o valor existente. Se o arquivo não existir ou a variável estiver vazia, solicite a URL.

**Se opção 2:** use o valor informado pelo usuário.

### 8.2 — Perguntar sobre credenciais de teste

Pergunte ao usuário:
> "As credenciais de teste estão configuradas?
> 1. Já estão no .env (ou foram lidas do framework no passo 8.0) — pular esta etapa
> 2. Sim, vou informar agora
> 3. Não / vou configurar depois"

**Se opção 1:** verifique se o `.env` lido no passo 8.0 contém credenciais preenchidas (variáveis `*_CPF` e `*_PASSWORD`, ou `*_EMAIL` e `*_PASSWORD`). Se sim, confirme os perfis encontrados e siga em frente. Se estiverem vazias, trate como opção 3.

**Se opção 2:** pergunte:
> "A aplicação usa CPF ou e-mail para login?
> 1. CPF (variáveis do tipo PERFIL_CPF / PERFIL_PASSWORD)
> 2. E-mail (variáveis do tipo PERFIL_EMAIL / PERFIL_PASSWORD)"
>
> Em seguida: "Informe os pares credencial+senha para cada perfil disponível. Deixe em branco os que não se aplicam. Perfis comuns: admin, n1, n2, n3, auditor, agricultor, multiplicador, distribuidor, b2b, avaliador, rtvs, rtvi"

**Se opção 3:** registre que as credenciais estão pendentes.

### 8.3 — Perguntar sobre repositório de código-fonte

Pergunte ao usuário:
> "Você tem acesso local ao repositório de código-fonte da aplicação? Se sim, informe o caminho absoluto do diretório. (Ex: /home/user/minha-app ou C:/projetos/minha-app). Se não, pressione Enter para deixar em branco."

Registre o valor informado (pode ficar vazio).

### 8.3.5 — Configurar integração Azure DevOps (opcional)

Pergunte ao usuário:
> "Deseja integrar com Azure DevOps para buscar contexto de Work Items automaticamente?
> 1. Sim — informar credenciais agora
> 2. Já estão no .env (ou foram lidas do framework no passo 8.0)
> 3. Não / vou configurar depois"

**Se opção 1:** pergunte:
> "Informe as credenciais do Azure DevOps:
> - Organização (AZURE_DEVOPS_ORG): nome que aparece em dev.azure.com/**nome**/...
> - Projeto (AZURE_DEVOPS_PROJECT): nome do projeto dentro da organização
> - PAT (AZURE_DEVOPS_PAT): token de acesso pessoal com permissão 'Work Items → Read'
>   (Para gerar: dev.azure.com → perfil → Personal access tokens → New Token → Work Items: Read)"

**Se opção 2:** confirme os valores lidos do framework (passo 8.0) e registre-os.

**Se opção 3:** deixe as variáveis em branco.

> Com Azure DevOps configurado, o `/e2e-feature` aceita nomes no formato `{id}-{nome}` (ex: `1234-login-social`) e busca automaticamente a User Story para enriquecer o planejamento.

### 8.4 — Criar arquivos .env e .env.example

Crie o `.env` com as informações coletadas. Use o formato CPF-based se a aplicação usar CPF para login, ou e-mail-based caso contrário:

**Formato CPF-based (padrão desta aplicação):**
```bash
# URL base da aplicação
BASE_URL=<valor informado pelo usuário>

# Credenciais por perfil: {PERFIL}_CPF e {PERFIL}_PASSWORD
# Inclua apenas os perfis disponíveis na aplicação
ADMIN_CPF=<cpf do admin>
ADMIN_PASSWORD=<senha>

N1_CPF=<cpf>
N1_PASSWORD=<senha>

N2_CPF=<cpf>
N2_PASSWORD=<senha>

N3_CPF=<cpf>
N3_PASSWORD=<senha>

AUDITOR_CPF=<cpf>
AUDITOR_PASSWORD=<senha>

AGRICULTOR_CPF=<cpf>
AGRICULTOR_PASSWORD=<senha>

MULTIPLICADOR_CPF=<cpf>
MULTIPLICADOR_PASSWORD=<senha>

DISTRIBUIDOR_CPF=<cpf>
DISTRIBUIDOR_PASSWORD=<senha>

B2B_CPF=<cpf>
B2B_PASSWORD=<senha>

AVALIADOR_CPF=<cpf>
AVALIADOR_PASSWORD=<senha>

RTVS_CPF=<cpf>
RTVS_PASSWORD=<senha>

RTVI_CPF=<cpf>
RTVI_PASSWORD=<senha>

# Caminho local do repositório de código-fonte da aplicação (opcional)
SOURCE_REPO_PATH=<valor informado ou deixar vazio>

# Azure DevOps (opcional — habilita busca automática de Work Items)
AZURE_DEVOPS_ORG=<nome da organização em dev.azure.com>
AZURE_DEVOPS_PROJECT=<nome do projeto>
AZURE_DEVOPS_PAT=<personal access token com Work Items: Read>
```

> Se o framework `.env` foi lido no passo 8.0, copie os valores diretamente de lá em vez de usar os placeholders acima. Remova perfis que não tiverem credenciais configuradas.

Crie também o `.env.example` com o mesmo conteúdo mas com valores ilustrativos (sem dados reais):

```bash
# URL base da aplicação
BASE_URL=https://meu-app.com

# Credenciais por perfil
ADMIN_CPF=12345678900
ADMIN_PASSWORD=#Senha123

N1_CPF=98765432100
N1_PASSWORD=#Senha123

# ... demais perfis

# Caminho local do repositório de código-fonte da aplicação (opcional)
SOURCE_REPO_PATH=/home/user/minha-app

# Azure DevOps (opcional — habilita busca automática de Work Items)
AZURE_DEVOPS_ORG=minha-organizacao
AZURE_DEVOPS_PROJECT=meu-projeto
AZURE_DEVOPS_PAT=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Passo 8.5: Criar configuração de permissões dos subagentes

Para que os subagentes executem ferramentas de browser e gravem arquivos de teste sem interrupção, crie o arquivo `.claude/settings.local.json`:

```bash
mkdir -p .claude
```

Crie `.claude/settings.local.json` com o conteúdo:

```json
{
  "permissions": {
    "allow": [
      "Bash(node:*)",
      "Bash(npm:*)",
      "Bash(npx:*)",
      "Bash(git:*)",
      "Bash(mkdir:*)",
      "Bash(cp:*)",
      "Bash(mv:*)",
      "Bash(cat:*)",
      "Bash(grep:*)",
      "Bash(ls:*)",
      "Bash(echo:*)",
      "Bash(claude:*)",
      "Bash(BASE_URL:*)",
      "mcp__playwright-test__browser_navigate",
      "mcp__playwright-test__browser_click",
      "mcp__playwright-test__browser_snapshot",
      "mcp__playwright-test__browser_type",
      "mcp__playwright-test__browser_evaluate",
      "mcp__playwright-test__browser_wait_for",
      "mcp__playwright-test__browser_take_screenshot",
      "mcp__playwright-test__browser_hover",
      "mcp__playwright-test__browser_select_option",
      "mcp__playwright-test__browser_fill_form",
      "mcp__playwright-test__browser_handle_dialog",
      "mcp__playwright-test__browser_navigate_back",
      "mcp__playwright-test__browser_press_key",
      "mcp__playwright-test__browser_console_messages",
      "mcp__playwright-test__browser_network_requests",
      "mcp__playwright-test__browser_file_upload",
      "mcp__playwright-test__browser_drag",
      "mcp__playwright-test__test_run",
      "mcp__playwright-test__test_debug",
      "mcp__playwright-test__test_list",
      "mcp__playwright-test__generator_setup_page",
      "mcp__playwright-test__generator_read_log",
      "mcp__playwright-test__generator_write_test",
      "mcp__playwright-test__planner_setup_page",
      "mcp__playwright-test__planner_save_plan",
      "mcp__mcp-e2e__run_e2e_tests",
      "mcp__mcp-e2e__collect_metrics",
      "mcp__mcp-e2e__check_quality_gates"
    ]
  },
  "enableAllProjectMcpServers": true,
  "enabledMcpjsonServers": ["playwright-test", "mcp-e2e"]
}
```

---

## Passo 9: Inicializar git (se necessário)

```bash
git init
git add .
git commit -m "feat: inicializa projeto de automação E2E"
```

---

## Passo 10: Confirmar inicialização

Ao finalizar, exiba o resumo da inicialização:

```
✅ Projeto de automação E2E inicializado com a arquitetura padrão!

Estrutura criada:
  src/
    api/services/    → BaseService.ts
    api/helpers/     → api.helper.ts
    web/pages/       → BasePage.ts
    web/helpers/     → web.helper.ts
    shared/models/   → User.ts
    shared/factories/ → UserFactory.ts
    shared/fixtures/ → base.fixture.ts
    shared/helpers/  → env.helper.ts
  tests/api/         → specs de API (a criar)
  tests/web/         → specs de Web (a criar)
  specs/bugs/

Arquivos de configuração:
  playwright.config.ts  → projetos web-chromium e api separados
  tsconfig.json
  eslint.config.mjs
  .prettierrc
  .github/workflows/e2e.yml
  .env, .env.example

Scripts disponíveis:
  npm test              → todos os testes
  npm run test:web      → apenas testes Web (web-chromium)
  npm run test:api      → apenas testes API
  npm run test:headed   → browser visível
  npm run lint          → verificar código
  npm run lint:fix      → corrigir lint automaticamente
  npm run format        → formatar código
  npm run format:check  → verificar formatação
  npm run typecheck     → verificar TypeScript sem compilar

Relatórios gerados:
  playwright-report/    → HTML report
  allure-results/       → dados Allure (rodar: npx allure serve allure-results)
  junit-results/        → XML JUnit para CI
```

**Se as credenciais de teste não foram fornecidas**, adicione aviso:

```
⚠️  Credenciais de teste não configuradas.
Preencha as variáveis no arquivo .env antes de rodar /e2e-feature em features que exigem login.
O arquivo .env.example contém o template completo.
```

**Em seguida**, oriente o próximo passo:

```
🔄 Reinicie o Claude Code agora para ativar os MCPs registrados.

👉 Após reiniciar: /e2e-feature {id}-{nome-da-feature}
   Exemplo: /e2e-feature 1234-login
```
