# Arquitetura do Framework de Testes — Playwright + TypeScript

## Visão Geral

Este projeto é um **boilerplate de automação de testes** para aplicações **Web** e **API**, construído com **Playwright** em **TypeScript**. Ele segue padrões consolidados da indústria para garantir manutenibilidade, escalabilidade e clareza na organização do código.

---

## Estrutura de Pastas

```
template-web-api/
├── src/
│   ├── api/                    # Camada exclusiva para testes de API
│   │   ├── services/           # Clientes HTTP (Service Pattern)
│   │   └── helpers/            # Utilitários específicos de API
│   ├── web/                    # Camada exclusiva para testes Web/UI
│   │   ├── pages/              # Page Objects (POM Pattern)
│   │   └── helpers/            # Utilitários específicos de Web
│   └── shared/                 # Código compartilhado entre API e Web
│       ├── models/             # Interfaces e tipos TypeScript
│       ├── factories/          # Geração de dados de teste (Factory Pattern)
│       ├── fixtures/           # Fixtures do Playwright (Injeção de Dependência)
│       └── helpers/            # Utilitários compartilhados (env, config)
├── tests/
│   ├── api/                    # Specs de testes de API
│   └── web/                    # Specs de testes Web/UI
├── playwright.config.ts        # Configuração do Playwright (Web + API)
├── tsconfig.json               # Configuração do TypeScript
└── package.json                # Dependências e scripts
```

---

## Separação `api/` vs `web/` vs `shared/` dentro de `src/`

### Por que separar?

Sem separação, o `src/` fica com pastas que servem a contextos diferentes misturadas na raiz:

```
# ❌ Estrutura plana (confusa em projetos maiores)
src/
├── pages/          # Só web usa
├── services/       # Só api usa
├── helpers/        # Mistura helpers de web e api
├── models/         # Compartilhado
├── factories/      # Compartilhado
└── fixtures/       # Compartilhado
```

Com a separação, o desenvolvedor sabe instantaneamente o escopo de cada arquivo:

```
# ✅ Estrutura separada (clara e escalável)
src/
├── api/            # Tudo que SÓ testes de API usam
├── web/            # Tudo que SÓ testes de Web usam
└── shared/         # Tudo que AMBAS as camadas compartilham
```

### Benefícios

1. **Clareza de contexto**: Ao abrir `src/api/services/UserService.ts`, você sabe que é um cliente HTTP. Ao abrir `src/web/pages/LoginPage.ts`, você sabe que é um Page Object.
2. **Onboarding mais rápido**: Novos membros entendem a divisão imediatamente.
3. **Independência de deploy**: Se o projeto crescer, cada camada pode virar um módulo independente.
4. **Evita imports errados**: Um teste de API não deveria importar Page Objects, e vice-versa. A separação torna isso visualmente óbvio.

---

## Detalhamento de Cada Pasta

---

### `src/shared/models/` — Contratos de Dados

**Propósito**: Definir interfaces TypeScript que representam as entidades do sistema. São os contratos de dados usados por services, pages, factories e testes.

**Princípio**: Single Source of Truth — se a API muda o formato de `User`, você altera num lugar só e o compilador aponta todos os impactos.

**Quando criar um novo model**:
- Sempre que uma nova entidade do sistema precisar ser representada nos testes
- Quando a API retorna um formato que precisa ser tipado

**Exemplo — `User.ts`**:

```typescript
export interface User {
  id?: string;
  name: string;
  email: string;
  cpf?: string;
  password: string;
  role: "admin" | "user" | "viewer";
}

export interface LoginCredentials {
  emailOrCpf: string;  // Campo único: aceita email OU CPF (adapte conforme a aplicação)
  password: string;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, "password">;
}
```

**Exemplo — `Product.ts`** (categorias de exemplo — adapte ao domínio da aplicação):

```typescript
export type ProductCategory =
  | "feminino" | "masculino" | "infantil" | "beleza"
  | "calcados" | "esportivo" | "jeans" | "acessorios";

export interface Product {
  id?: string;
  name: string;
  description: string;
  refCode: string;
  category: ProductCategory;
  color: string;
  sizes: string[];
  originalPrice: number;
  discountPrice?: number;
  discountPercentage?: number;
  installments: string;       // ex: "7x sem juros no Cartão da Loja"
  imageUrls: string[];
  videoUrl?: string;
  collection?: string;
  stock: number;
  isActive: boolean;
}

export interface ProductFilter {
  category?: ProductCategory;
  minPrice?: number;
  maxPrice?: number;
  color?: string;
  size?: string;
  collection?: string;
  onSale?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

**Regras**:
- Apenas interfaces/tipos, nunca lógica de negócio
- Use `Omit`, `Pick`, `Partial` para derivar tipos e evitar duplicação
- O campo `id` é opcional (`id?`) porque factories geram objetos sem id (o backend é quem atribui)
- Use union types (`"admin" | "user"`) para campos com valores fixos

---

### `src/shared/factories/` — Geração de Dados de Teste (Factory Pattern)

**Propósito**: Gerar dados de teste realistas e únicos usando `@faker-js/faker`. Cada execução produz dados diferentes, evitando colisões e dependências entre testes.

**Princípio**: Testes independentes — nenhum teste deve depender de dados fixos no banco ou de outro teste ter rodado antes.

**Quando criar uma nova factory**:
- Sempre que criar um novo model
- A factory é a companheira direta do model

**Exemplo — `UserFactory.ts`** (com CPF válido):

```typescript
import { faker } from "@faker-js/faker";
import { User } from "../models/User";

function generateCpf(): string {
  // Gera CPF válido com dígitos verificadores corretos
  const digits = Array.from({ length: 9 }, () => faker.number.int({ min: 0, max: 9 }));
  // ... cálculo dos dígitos verificadores ...
  return `${digits.slice(0,3).join("")}.${digits.slice(3,6).join("")}.${digits.slice(6,9).join("")}-${digits.slice(9).join("")}`;
}

export class UserFactory {
  static build(overrides: Partial<User> = {}): User {
    return {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      cpf: generateCpf(),
      password: faker.internet.password({ length: 12 }),
      role: "user",
      ...overrides,
    };
  }

  static buildMany(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }
}
```

**Exemplo — `ProductFactory.ts`** (dados de exemplo — adapte ao domínio da aplicação):

```typescript
import { faker } from "@faker-js/faker";
import { Product, ProductCategory } from "../models/Product";

const categories: ProductCategory[] = [
  "feminino", "masculino", "infantil", "beleza",
  "calcados", "esportivo", "jeans", "acessorios",
];

const productNames: Record<ProductCategory, string[]> = {
  feminino: ["Vestido Midi Estampado", "Blusa Cropped Canelada", ...],
  masculino: ["Camiseta Básica Algodão", "Camisa Polo Piquet", ...],
  // ... demais categorias
};

export class ProductFactory {
  static build(overrides: Partial<Product> = {}): Product {
    const category = faker.helpers.arrayElement(categories);
    const originalPrice = parseFloat(faker.commerce.price({ min: 29.9, max: 599.9 }));
    // Calcula desconto aleatório
    return {
      name: faker.helpers.arrayElement(productNames[category]),
      refCode: faker.string.alphanumeric({ length: 8, casing: "upper" }),
      category,
      color: faker.helpers.arrayElement(["Preto", "Branco", "Azul Marinho", ...]),
      sizes: faker.helpers.arrayElements(["PP", "P", "M", "G", "GG", "XG"]),
      originalPrice,
      installments: `7x sem juros no Cartão da Loja`,
      ...overrides,
    };
  }

  // Métodos de cenário (adapte ao domínio da aplicação)
  static buildOnSale(overrides: Partial<Product> = {}): Product { /* ... */ }
  static buildFeminino(overrides: Partial<Product> = {}): Product { /* ... */ }
  static buildMasculino(overrides: Partial<Product> = {}): Product { /* ... */ }
}
```

**Regras**:
- Sempre aceitar `overrides: Partial<T>` para customização
- Usar `...overrides` por último para que sobrescreva os defaults
- Criar métodos de cenário (`buildOutOfStock`, `buildExpensive`) quando um padrão de dados se repetir nos testes
- Nunca colocar lógica de API ou browser na factory — ela só gera objetos

**Uso nos testes**:

```typescript
// Dados aleatórios com CPF
const user = UserFactory.build();

// Dados customizados
const admin = UserFactory.build({ role: "admin" });

// Múltiplos registros
const users = UserFactory.buildMany(5);

// Cenários de exemplo
const vestido = ProductFactory.buildFeminino();
const oferta = ProductFactory.buildOnSale();
const camiseta = ProductFactory.buildMasculino();
```

---

### `src/shared/fixtures/` — Injeção de Dependência do Playwright

**Propósito**: Estender o `test` do Playwright com fixtures customizadas que injetam automaticamente Page Objects e Services nos testes. É o ponto central de composição do framework.

**Princípio**: Dependency Injection — os testes declaram o que precisam e o framework fornece, sem instanciação manual.

**Quando alterar este arquivo**:
- Sempre que adicionar um novo Page Object ou Service

**Exemplo — `base.fixture.ts`**:

```typescript
import { test as base } from "@playwright/test";
import { LoginPage } from "../../web/pages/LoginPage";
import { HomePage } from "../../web/pages/HomePage";
import { ProductDetailPage } from "../../web/pages/ProductDetailPage";
import { SacolaPage } from "../../web/pages/SacolaPage";
import { AuthService } from "../../api/services/AuthService";
import { UserService } from "../../api/services/UserService";
import { ProductService } from "../../api/services/ProductService";

type Pages = {
  loginPage: LoginPage;
  homePage: HomePage;
  productDetailPage: ProductDetailPage;
  sacolaPage: SacolaPage;
};

type Services = {
  authService: AuthService;
  userService: UserService;
  productService: ProductService;
};

export const test = base.extend<Pages & Services>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  productDetailPage: async ({ page }, use) => {
    await use(new ProductDetailPage(page));
  },
  sacolaPage: async ({ page }, use) => {
    await use(new SacolaPage(page));
  },
  authService: async ({ request }, use) => {
    await use(new AuthService(request));
  },
  userService: async ({ request }, use) => {
    await use(new UserService(request));
  },
  productService: async ({ request }, use) => {
    await use(new ProductService(request));
  },
});

export { expect } from "@playwright/test";
```

**Como funciona**:
- `base.extend<Pages & Services>()` cria um `test` customizado com fixtures tipadas
- Pages recebem `{ page }` (instância do browser do Playwright)
- Services recebem `{ request }` (cliente HTTP do Playwright)
- O teste só precisa declarar o que usa na assinatura: `async ({ loginPage, homePage, sacolaPage }) => {}`
- Fixtures não usadas não são instanciadas (lazy)

**Regras**:
- Sempre exportar `expect` junto com `test`
- Usar nomes descritivos: `loginPage` (não `lp`), `authService` (não `auth`)
- Os testes importam `test` e `expect` daqui, nunca diretamente do `@playwright/test`

---

### `src/shared/helpers/` — Utilitários Compartilhados

**Propósito**: Código utilitário usado por ambas as camadas (API e Web). Atualmente contém a validação de variáveis de ambiente.

**Quando colocar algo aqui**:
- Quando o helper é usado tanto por testes de API quanto de Web
- Configurações, formatadores, parsers genéricos

**Exemplo — `env.helper.ts`**:

```typescript
import dotenv from "dotenv";
import { z } from "zod/v4";

dotenv.config();

const envSchema = z.object({
  BASE_URL: z.url().default("https://example.com"),
  API_URL: z.url().default("https://api.example.com"),
  API_TOKEN: z.string().optional(),
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = z.prettifyError(result.error);
    throw new Error(`Environment validation failed:\n${formatted}`);
  }

  return result.data;
}

export const env = loadEnv();
```

**Regras**:
- Usar Zod para validar env vars — fail-fast é melhor que erro misterioso no meio do teste
- O `env` exportado é tipado automaticamente pelo schema Zod
- Se um helper é específico de API ou Web, ele vai na pasta `helpers/` da respectiva camada

---

### `src/api/services/` — Clientes HTTP (Service Pattern)

**Propósito**: Encapsular chamadas HTTP em classes tipadas. Cada service representa um recurso/endpoint da API (`/users`, `/auth`, `/products`).

**Princípio**: Encapsulamento — se um endpoint muda, você corrige em um lugar só. Os testes usam métodos semânticos (`userService.create(user)`) em vez de `request.post("/users", { data })`.

**Quando criar um novo service**:
- Para cada novo grupo de endpoints da API (um controller REST = um service)

**Exemplo — `BaseService.ts`** (classe abstrata base):

```typescript
import { APIRequestContext, APIResponse } from "@playwright/test";

export abstract class BaseService {
  constructor(protected readonly request: APIRequestContext) {}

  protected abstract get basePath(): string;

  protected async get(path = "", params?: Record<string, string>): Promise<APIResponse> {
    return this.request.get(`${this.basePath}${path}`, { params });
  }

  protected async post(path = "", data?: unknown): Promise<APIResponse> {
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

**Exemplo — `ProductService.ts`** (service concreto — exemplo de filtros):

```typescript
import { APIRequestContext, APIResponse } from "@playwright/test";
import { BaseService } from "./BaseService";
import { Product, ProductFilter } from "../../shared/models/Product";

export class ProductService extends BaseService {
  constructor(request: APIRequestContext) {
    super(request);
  }

  protected get basePath() {
    return "/products";
  }

  async list(filter?: ProductFilter): Promise<APIResponse> {
    const params: Record<string, string> = {};

    if (filter?.category) params.category = filter.category;
    if (filter?.minPrice !== undefined) params.minPrice = String(filter.minPrice);
    if (filter?.maxPrice !== undefined) params.maxPrice = String(filter.maxPrice);
    if (filter?.color) params.color = filter.color;
    if (filter?.size) params.size = filter.size;
    if (filter?.collection) params.collection = filter.collection;
    if (filter?.onSale !== undefined) params.onSale = String(filter.onSale);

    return this.get("", params);
  }

  async getById(id: string): Promise<APIResponse> {
    return this.get(`/${id}`);
  }

  async create(data: Omit<Product, "id">): Promise<APIResponse> {
    return this.post("", data);
  }

  async update(id: string, data: Partial<Product>): Promise<APIResponse> {
    return this.put(`/${id}`, data);
  }

  async partialUpdate(id: string, data: Partial<Product>): Promise<APIResponse> {
    return this.patch(`/${id}`, data);
  }

  async remove(id: string): Promise<APIResponse> {
    return this.delete(`/${id}`);
  }
}
```

**Regras**:
- Sempre herdar de `BaseService`
- O `basePath` define o prefixo do endpoint (`/products`, `/users`, `/auth`)
- Métodos públicos usam nomes semânticos: `list()`, `create()`, `remove()` (não `get()`, `post()`, `delete()`)
- Parâmetros tipados com os models do `shared/models/`
- Retornar `APIResponse` sem fazer parse — quem faz o assert é o teste

---

### `src/api/helpers/` — Utilitários Exclusivos de API

**Propósito**: Funções auxiliares usadas apenas em testes de API (assertions de response, manipulação de headers, etc.).

**Quando colocar algo aqui**:
- Helpers que só fazem sentido no contexto de chamadas HTTP/API

**Exemplo — `api.helper.ts`**:

```typescript
import { APIResponse, expect } from "@playwright/test";

export async function expectStatus(response: APIResponse, status: number) {
  expect(response.status()).toBe(status);
}

export async function expectBodyContains(response: APIResponse, key: string) {
  const body = await response.json();
  expect(body).toHaveProperty(key);
}

export async function expectResponseTime(response: APIResponse, maxMs: number) {
  const timing = response.headers()["x-response-time"];
  if (timing) {
    expect(parseInt(timing, 10)).toBeLessThanOrEqual(maxMs);
  }
}
```

**Uso nos testes**:

```typescript
const response = await userService.create(user);
await expectStatus(response, 201);
await expectBodyContains(response, "id");
await expectResponseTime(response, 500);
```

---

### `src/web/pages/` — Page Objects (POM Pattern)

**Propósito**: Encapsular a interação com páginas da aplicação. Cada página vira uma classe que abstrai seletores e ações.

**Princípio**: Se um seletor muda (ex: `data-testid="email-input"` vira `data-testid="email-field"`), você corrige em **um único lugar** — o Page Object — em vez de em dezenas de testes.

**Quando criar um novo Page Object**:
- Para cada página ou componente significativo da aplicação que será testado

**Exemplo — `BasePage.ts`** (classe abstrata base):

```typescript
import { Page, Locator } from "@playwright/test";

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  protected get url(): string {
    return "/";
  }

  async navigate() {
    await this.page.goto(this.url);
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }

  protected getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  protected getByRole(
    role: Parameters<Page["getByRole"]>[0],
    options?: Parameters<Page["getByRole"]>[1],
  ): Locator {
    return this.page.getByRole(role, options);
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState("networkidle");
  }
}
```

**Exemplo — `ProductDetailPage.ts`** (PDP — Página de Detalhe do Produto):

```typescript
import { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class ProductDetailPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  protected get url() {
    return "/produto";
  }

  // ===== SELETORES (privados — nunca expostos ao teste) =====

  private get imageGallery() {
    return this.getByTestId("product-image-gallery");
  }

  private get originalPrice() {
    return this.getByTestId("original-price");
  }

  private get discountPrice() {
    return this.getByTestId("discount-price");
  }

  private get installmentInfo() {
    return this.getByTestId("installment-info");
  }

  private get colorSelector() {
    return this.getByTestId("color-selector");
  }

  private get sizeSelector() {
    return this.getByTestId("size-selector");
  }

  private get addToSacolaButton() {
    return this.getByRole("button", { name: "ADICIONAR À SACOLA" });
  }

  private get cepInput() {
    return this.getByTestId("cep-input");
  }

  // ===== AÇÕES (públicas — interface do Page Object) =====

  async getOriginalPrice(): Promise<string> {
    return (await this.originalPrice.textContent()) ?? "";
  }

  async selectColor(color: string) {
    await this.colorSelector.locator(`[data-testid="color-option"]:has-text("${color}")`).click();
  }

  async selectSize(size: string) {
    await this.sizeSelector.locator(`[data-testid="size-option"]:has-text("${size}")`).click();
  }

  async addToSacola() {
    await this.addToSacolaButton.click();
  }

  async calculateShipping(cep: string) {
    await this.cepInput.fill(cep);
    await this.page.getByRole("button", { name: "Calcular" }).click();
  }
}
```

**Regras**:
- Sempre herdar de `BasePage`
- Seletores são `private` — o teste nunca acessa o seletor diretamente
- Ações são `async` e públicas — o teste chama `productsPage.search("laptop")`
- Preferir `getByTestId` e `getByRole` — são mais resilientes que seletores CSS
- Não fazer assertions no Page Object — quem faz assert é o teste
- O Page Object devolve dados (`getOriginalPrice()`, `getInstallmentInfo()`) e o teste decide se está correto

---

### `src/web/helpers/` — Utilitários Exclusivos de Web

**Propósito**: Funções auxiliares usadas apenas em testes Web/UI (toasts, navegação, loading states, etc.).

**Quando colocar algo aqui**:
- Helpers que dependem de `Page` ou interagem com o DOM

**Exemplo — `web.helper.ts`** (helpers de UI):

```typescript
import { Page, expect } from "@playwright/test";

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
  await spinner.waitFor({ state: "hidden", timeout: 10000 });
}

export async function expectPriceFormat(text: string) {
  expect(text).toMatch(/R\$\s?\d+[.,]\d{2}/);
}

export async function expectParcelamentoInfo(text: string) {
  expect(text).toContain("sem juros");
  expect(text).toMatch(/\d+x/);
}
```

---

### `tests/api/` — Specs de Testes de API

**Propósito**: Arquivos `.spec.ts` que testam endpoints da API diretamente via HTTP, sem browser.

**Quando criar um novo spec**:
- Para cada grupo de endpoints (1 controller = 1 spec file)

**Exemplo — `products.spec.ts`** (filtros e categorias):

```typescript
import { test, expect } from "../../src/shared/fixtures/base.fixture";
import { ProductFactory } from "../../src/shared/factories/ProductFactory";
import { expectStatus, expectBodyContains } from "../../src/api/helpers/api.helper";

test.describe("Products API", () => {
  test("GET /products - should list all products", async ({ productService }) => {
    const response = await productService.list();

    await expectStatus(response, 200);
    const body = await response.json();
    expect(body).toHaveProperty("data");
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test("GET /products - should filter by category feminino", async ({ productService }) => {
    const response = await productService.list({ category: "feminino" });

    await expectStatus(response, 200);
    const body = await response.json();
    for (const product of body.data) {
      expect(product.category).toBe("feminino");
    }
  });

  test("GET /products - should filter by color", async ({ productService }) => {
    const response = await productService.list({ color: "Preto" });

    await expectStatus(response, 200);
  });

  test("GET /products - should filter products on sale", async ({ productService }) => {
    const response = await productService.list({ onSale: true });

    await expectStatus(response, 200);
  });

  test("POST /products - should create a new product", async ({ productService }) => {
    const product = ProductFactory.buildFeminino();
    const response = await productService.create(product);

    await expectStatus(response, 201);
    await expectBodyContains(response, "id");
    const body = await response.json();
    expect(body.name).toBe(product.name);
    expect(body.category).toBe("feminino");
  });

  test("DELETE /products/:id - should delete product", async ({ productService }) => {
    const response = await productService.remove("1");
    await expectStatus(response, 204);
  });
});
```

**Regras**:
- Nome do arquivo: `{recurso}.spec.ts` (ex: `users.spec.ts`, `auth.spec.ts`)
- Usar `test.describe` para agrupar por recurso
- Nome do teste segue: `{MÉTODO} {endpoint} - should {comportamento esperado}`
- Importar `test` e `expect` do fixture, nunca do `@playwright/test`
- Usar factories para gerar dados — nunca hardcoded
- Usar helpers de API para assertions comuns

---

### `tests/web/` — Specs de Testes Web/UI

**Propósito**: Arquivos `.spec.ts` que testam a interface da aplicação via browser.

**Quando criar um novo spec**:
- Para cada página ou fluxo de usuário significativo

**Exemplo — `product-detail.spec.ts`** (PDP):

```typescript
import { test, expect } from "../../src/shared/fixtures/base.fixture";
import { expectPriceFormat, expectParcelamentoInfo } from "../../src/web/helpers/web.helper";

test.describe("Product Detail Page (PDP)", () => {
  test.beforeEach(async ({ productDetailPage }) => {
    await productDetailPage.navigate();
  });

  test("should display original price in R$ format", async ({ productDetailPage }) => {
    const price = await productDetailPage.getOriginalPrice();
    await expectPriceFormat(price);
  });

  test("should display installment info", async ({ productDetailPage }) => {
    const installment = await productDetailPage.getInstallmentInfo();
    await expectParcelamentoInfo(installment);
  });

  test("should select color and size", async ({ productDetailPage }) => {
    await productDetailPage.selectColor("Preto");
    await productDetailPage.selectSize("M");
  });

  test("should add product to sacola", async ({ productDetailPage }) => {
    await productDetailPage.selectColor("Preto");
    await productDetailPage.selectSize("M");
    await productDetailPage.addToSacola();
  });

  test("should calculate shipping by CEP", async ({ productDetailPage }) => {
    await productDetailPage.calculateShipping("90010-000");
    const result = await productDetailPage.getShippingResult();
    expect(result).toBeTruthy();
  });
});
```

**Regras**:
- Nome do arquivo: `{página}.spec.ts` (ex: `login.spec.ts`, `home.spec.ts`, `product-detail.spec.ts`, `sacola.spec.ts`)
- Usar `test.beforeEach` para navegar à página
- Interagir via Page Object — nunca usar `page.click()` diretamente no teste
- Testes de UI devem ser focados e rápidos — testar um comportamento por teste

---

## Fluxo de Dados

```
┌──────────────────────────────────────────────────────────┐
│                        tests/                            │
│  ┌──────────────────┐         ┌──────────────────┐       │
│  │  api/*.spec      │         │  web/*.spec      │       │
│  │  (Playwright)    │         │  (Playwright)    │       │
│  └────────┬─────────┘         └────────┬─────────┘       │
│           │ importa                    │ importa          │
│           ▼                            ▼                  │
│  ┌──────────────────────────────────────────────────┐    │
│  │         src/shared/fixtures/base.fixture.ts      │    │
│  │         (injeta services e pages nos testes)     │    │
│  └──────────────┬──────────────────┬────────────────┘    │
│                 │                  │                      │
│                 ▼                  ▼                      │
│  ┌──────────────────┐    ┌──────────────────┐            │
│  │  src/api/        │    │  src/web/        │            │
│  │  services/       │    │  pages/          │            │
│  └────────┬─────────┘    └────────┬─────────┘            │
│           │                       │                      │
│           ▼                       ▼                      │
│  ┌──────────────────────────────────────────────────┐    │
│  │              src/shared/models/                  │    │
│  │              (interfaces TypeScript)             │    │
│  └──────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────┐    │
│  │           src/shared/factories/                  │    │
│  │           (geração de dados de teste)            │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

---

## Checklist para Adicionar uma Nova Entidade

Ao adicionar uma nova entidade (ex: `Order`), siga estes passos:

1. **Model**: Criar `src/shared/models/Order.ts` com as interfaces
2. **Factory**: Criar `src/shared/factories/OrderFactory.ts` com `build()` e `buildMany()`
3. **Service** (se tiver API): Criar `src/api/services/OrderService.ts` estendendo `BaseService`
4. **Page** (se tiver UI Web): Criar `src/web/pages/OrdersPage.ts` estendendo `BasePage`
5. **Fixture**: Registrar o novo service/page em `src/shared/fixtures/base.fixture.ts`
6. **Tests API**: Criar `tests/api/orders.spec.ts`
7. **Tests Web**: Criar `tests/web/orders.spec.ts`

---

## Configuração do Playwright

O `playwright.config.ts` define dois projetos independentes:

```typescript
projects: [
  {
    name: "web-chromium",
    use: { ...devices["Desktop Chrome"] },
    testDir: "./tests/web",       // ← só roda testes de UI
  },
  {
    name: "api",
    use: {
      extraHTTPHeaders: {
        Accept: "application/json",
      },
    },
    testDir: "./tests/api",       // ← só roda testes de API
  },
],
```

**Scripts disponíveis**:

```bash
npm test                     # Roda todos os testes Playwright (API + Web)
npm run test:web             # Roda apenas testes Web
npm run test:api             # Roda apenas testes API
npm run test:headed          # Roda testes Web com browser visível
npm run test:debug           # Modo debug do Playwright
npm run lint                 # Verifica código sem corrigir
npm run lint:fix             # Corrige automaticamente o que for possível
npm run format               # Formata todos os arquivos in-place
npm run format:check         # Verifica formatação sem alterar (útil em CI)
```

---

## Qualidade de Código e Automação de Git

### ESLint — Análise Estática de Código

Configurado em `eslint.config.mjs` no formato **Flat Config** (ESLint v9+), sem `.eslintrc`.

**Plugins ativos**:

| Plugin | Finalidade |
|---|---|
| `@typescript-eslint` | Regras específicas de TypeScript |
| `eslint-plugin-playwright` | Regras específicas para testes Playwright |
| `eslint-config-prettier` | Desativa regras que conflitam com o Prettier |

**Regras principais**:

```js
// TypeScript
"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }]  // variáveis com _ são permitidas
"@typescript-eslint/no-explicit-any": "warn"       // any gera warning, não erro
"@typescript-eslint/explicit-function-return-type": "off"  // inferência de tipo é suficiente

// Playwright (aplicado só em tests/api/** e tests/web/**)
"playwright/expect-expect": ["error", {
  assertFunctionNames: ["expect", "expectStatus", "expectBodyContains", "expectResponseTime"]
}]  // reconhece funções helper de assertion personalizadas
```

**Scripts**:

```bash
npm run lint        # verifica sem corrigir
npm run lint:fix    # corrige automaticamente o que for possível
```

---

### Prettier — Formatação de Código

Configurado em `.prettierrc`. Garante estilo de código consistente independentemente do editor.

**Configuração ativa**:

```json
{
  "semi": true,           // ponto-e-vírgula obrigatório
  "trailingComma": "all", // vírgula trailing em arrays, objetos e parâmetros
  "singleQuote": false,   // aspas duplas
  "printWidth": 100,      // quebra de linha após 100 caracteres
  "tabWidth": 2,          // indentação com 2 espaços
  "endOfLine": "lf"       // quebra de linha Unix (compatível com Git e CI/CD)
}
```

**Scripts**:

```bash
npm run format          # formata todos os arquivos in-place
npm run format:check    # verifica formatação sem alterar (útil em CI)
```

**Arquivos ignorados** (`.prettierignore`): `node_modules`, `dist`, `test-results`, `playwright-report`, `allure-results`, `package-lock.json`.

---

### Husky + lint-staged — Git Hooks Automáticos

**Husky** instala Git hooks automaticamente via script `prepare` no `package.json`. **lint-staged** garante que apenas os arquivos em stage (modificados no commit) sejam processados, tornando o hook rápido.

**Fluxo de um `git commit`**:

```
git commit
    └── Husky dispara .husky/pre-commit
            └── npx lint-staged
                    └── Para cada *.ts em stage:
                            ├── eslint --fix   (corrige e re-adiciona ao stage)
                            └── prettier --write (formata e re-adiciona ao stage)
```

**Configuração em `package.json`**:

```json
"lint-staged": {
  "*.ts": ["eslint --fix", "prettier --write"]
}
```

**Por que só `*.ts`**: arquivos de config (`.json`, `.mjs`, `.md`) não passam pelo ESLint TypeScript, mas o Prettier já os formata via `npm run format`.

**Regra**: nunca usar `--no-verify` para pular o hook — se o lint estiver falhando, o correto é corrigir o problema, não contorná-lo.

---

## Princípios Aplicados

| Princípio | Aplicação no Projeto |
|---|---|
| **Single Responsibility** | Cada pasta/classe tem uma responsabilidade clara |
| **Open/Closed** | `BasePage` e `BaseService` são extensíveis sem modificação |
| **DRY** | Classes base eliminam duplicação de código |
| **Fail-Fast** | Validação de env com Zod antes dos testes rodarem |
| **Independência** | Factories geram dados únicos por execução |
| **Encapsulamento** | Seletores são privados nos Page Objects |
| **Separação de Concerns** | API vs Web vs Shared em camadas distintas |
| **Dependency Injection** | Fixtures injetam dependências nos testes |
