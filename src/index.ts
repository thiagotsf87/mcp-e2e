// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { execSync } from "child_process";
import { readFileSync, readdirSync, existsSync, Dirent } from "fs";
import { join } from "path";
import { z } from "zod";

const server = new McpServer({
  name: "mcp-e2e",
  version: "1.0.0",
});

// === TOOL 1: Executar testes E2E ===
server.tool(
  "run_e2e_tests",
  "Executa testes E2E do Playwright para uma suite ou cenário específico",
  {
    suite: z.string().describe("Nome da suite de testes (ex: checkout, login, smoke)"),
    tags: z.string().optional().describe("Tags para filtrar testes (ex: @smoke, @regression)"),
    browser: z.enum(["chromium", "firefox", "webkit"]).default("chromium"),
    headless: z.boolean().default(true),
    project_path: z.string().optional().describe("Caminho raiz do projeto (padrão: diretório atual)"),
  },
  async ({ suite, tags, browser, headless, project_path }) => {
    const root = project_path ?? process.cwd();
    const tagFilter = tags ? `--grep "${tags}"` : "";
    const headedFlag = headless ? "" : "--headed";
    const cmd = `npx playwright test tests/${suite} ${tagFilter} --project=${browser} ${headedFlag}`.trim();

    try {
      const output = execSync(cmd, { encoding: "utf-8", timeout: 300000, cwd: root });
      return {
        content: [{ type: "text", text: `✅ Testes executados com sucesso:\n${output}` }],
      };
    } catch (error: unknown) {
      const err = error as { stdout?: string; stderr?: string; message?: string };
      return {
        content: [{ type: "text", text: `❌ Falhas encontradas:\n${err.stdout ?? ""}\n${err.stderr ?? ""}` }],
      };
    }
  }
);

// === TOOL 2: Gerar Automation Health Report ===
server.tool(
  "generate_health_report",
  "Gera o relatório de saúde da automação com scores de maturidade",
  {
    period: z.string().describe("Período do relatório (ex: 2026-Q1, 2026-03)"),
    project_path: z.string().optional().describe("Caminho raiz do projeto de automação"),
  },
  async ({ period, project_path }) => {
    const metrics = collectAutomationMetrics(project_path);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          period,
          maturity_score: metrics.score,
          coverage: metrics.coverage,
          flaky_rate: metrics.flakyRate,
          execution_frequency: metrics.frequency,
          has_ci: metrics.hasCI,
          bugs_documented: metrics.bugCount,
          recommendations: metrics.recommendations,
        }, null, 2),
      }],
    };
  }
);

// === TOOL 3: Verificar Quality Gates ===
server.tool(
  "check_quality_gates",
  "Verifica se os quality gates da suite de testes estão passando",
  {
    suite: z.enum(["smoke", "regression", "full"]).default("smoke"),
    project_path: z.string().optional().describe("Caminho raiz do projeto de automação"),
  },
  async ({ suite, project_path }) => {
    const root = project_path ?? process.cwd();
    const suitePath = suite === "full" ? "tests" : `tests/${suite}`;
    const outputFile = join(root, "playwright-report", "_gates-result.json");

    const cmd = [
      "npx playwright test",
      suitePath,
      "--reporter=json",
      `--output-file=${outputFile}`,
      "--project=chromium",
    ].join(" ");

    try {
      execSync(cmd, { encoding: "utf-8", timeout: 300000, cwd: root });
      return {
        content: [{ type: "text", text: `✅ Quality gates OK para suite '${suite}'` }],
      };
    } catch {
      const failures = extractFailuresFromReport(outputFile);
      return {
        content: [{
          type: "text",
          text: `❌ Quality gates falharam na suite '${suite}':\n${failures.join("\n")}`,
        }],
      };
    }
  }
);

// === Funções auxiliares ===

function countSpecFiles(dir: string): number {
  if (!existsSync(dir)) return 0;
  let count = 0;
  const entries: Dirent[] = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      count += countSpecFiles(join(dir, entry.name));
    } else if (entry.name.endsWith(".spec.ts")) {
      count++;
    }
  }
  return count;
}

function collectAutomationMetrics(projectPath?: string) {
  const root = projectPath ?? process.cwd();
  const testsDir = join(root, "tests");
  const reportFile = join(root, "playwright-report", "results.json");
  const ciDir = join(root, ".github", "workflows");
  const bugsDir = join(root, "specs", "bugs");

  // Contagem de testes
  const smokeCount = countSpecFiles(join(testsDir, "smoke"));
  const regressionCount = countSpecFiles(join(testsDir, "regression"));
  const totalTests = countSpecFiles(testsDir);

  // CI/CD
  const hasCI = existsSync(ciDir) &&
    readdirSync(ciDir).some(f => f.endsWith(".yml") || f.endsWith(".yaml"));

  // Bugs documentados
  const bugCount = existsSync(bugsDir)
    ? readdirSync(bugsDir).filter(f => f.endsWith(".md")).length
    : 0;

  // Taxa de flaky a partir do último relatório
  let flakyRate = 0;
  if (existsSync(reportFile)) {
    try {
      const report = JSON.parse(readFileSync(reportFile, "utf-8")) as {
        stats?: { expected?: number; unexpected?: number; flaky?: number };
      };
      const stats = report.stats ?? {};
      const passed = stats.expected ?? 0;
      const failed = stats.unexpected ?? 0;
      const flaky = stats.flaky ?? 0;
      const total = passed + failed + flaky;
      flakyRate = total > 0 ? Math.round((flaky / total) * 100) : 0;
    } catch {
      // relatório ainda não gerado
    }
  }

  // Page Objects
  const hasPom = existsSync(join(testsDir, "pages"));

  // Scores por dimensão (0-5)
  const coverageScore =
    totalTests >= 30 ? 5 : totalTests >= 20 ? 4 : totalTests >= 10 ? 3 : totalTests >= 5 ? 2 : totalTests > 0 ? 1 : 0;
  const stabilityScore =
    flakyRate === 0 ? 5 : flakyRate < 2 ? 4 : flakyRate < 5 ? 3 : flakyRate < 10 ? 2 : 1;
  const ciScore = hasCI ? 4 : 0;
  const freqScore = hasCI ? 4 : 0;
  const maintScore = hasPom ? (totalTests > 0 ? 4 : 3) : 2;
  const docScore = existsSync(join(root, "specs")) ? 3 : 1;

  const score =
    coverageScore * 0.25 +
    stabilityScore * 0.20 +
    freqScore * 0.15 +
    maintScore * 0.15 +
    ciScore * 0.15 +
    docScore * 0.10;

  const recommendations: string[] = [];
  if (totalTests === 0) recommendations.push("Criar os primeiros testes automatizados com /e2e-feature");
  if (!hasCI) recommendations.push("Configurar GitHub Actions para execução automática (/e2e-init)");
  if (!hasPom && totalTests > 0) recommendations.push("Adotar Page Object Model para melhor manutenibilidade");
  if (flakyRate > 5) recommendations.push(`Reduzir taxa de flaky tests (atual: ${flakyRate}%) com /test-heal`);
  if (bugCount > 0) recommendations.push(`Revisar ${bugCount} bug(s) documentado(s) em specs/bugs/`);
  if (regressionCount === 0 && smokeCount > 0) recommendations.push("Adicionar testes de regressão além dos smoke tests");

  return {
    score: Math.round(score * 10) / 10,
    coverage: { total: totalTests, smoke: smokeCount, regression: regressionCount },
    flakyRate: `${flakyRate}%`,
    frequency: hasCI ? "automático (GitHub Actions)" : "manual",
    hasCI,
    bugCount,
    recommendations,
  };
}

function extractFailuresFromReport(reportFile: string): string[] {
  if (!existsSync(reportFile)) return ["Relatório de resultados não encontrado"];
  try {
    const report = JSON.parse(readFileSync(reportFile, "utf-8")) as {
      suites?: Array<{
        specs?: Array<{ ok: boolean; title?: string; fullTitle?: string }>;
      }>;
    };
    return (report.suites ?? [])
      .flatMap(s => s.specs ?? [])
      .filter(sp => !sp.ok)
      .map(sp => `  - ${sp.fullTitle ?? sp.title ?? "teste sem nome"}: FALHOU`);
  } catch {
    return ["Erro ao ler o relatório de resultados"];
  }
}

// Iniciar o servidor
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP E2E Server rodando via stdio");
}

main().catch(console.error);
