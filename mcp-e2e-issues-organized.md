# MCP-E2E — Issues & Observações da Execução

## 1. Infraestrutura / Tooling

### PA-01 — Conflito MCP Playwright (global) vs `@playwright/test` (projeto)
- **Problema:** O Playwright instalado globalmente pelo MCP entra em conflito com o `@playwright/test` do projeto. As ferramentas de browser não funcionam com essa combinação.
- **Impacto:** Exploração automática da aplicação completamente bloqueada — subagentes não conseguem usar ferramentas de browser.
- **Evidência:** _"Confirmado — conflito entre playwright (global do MCP) e @playwright/test (projeto). As ferramentas de browser não funcionarão neste projeto com essa combinação."_
- **Ação necessária:** Ajustar a inicialização (`init`) para configurar corretamente os MCPs necessários para o fluxo, resolvendo o conflito de dependências.

### PA-02 — `generator_write_test` sem permissão nos subagentes
- **Problema:** O agente gerador produziu o código dos testes, porém a tool `generator_write_test` teve a execução negada.
- **Impacto:** Arquivos tiveram que ser gravados manualmente pela sessão principal (6 arquivos gravados diretamente).
- **Ação necessária:** Revisar as permissões dos subagentes para garantir escrita autônoma, eliminando a necessidade de interação humana para gravar arquivos.

### PA-03 — Ferramentas de browser bloqueadas em subagentes com `run_in_background`
- **Problema:** Subagentes executados via `run_in_background` não conseguem acessar ferramentas de browser.
- **Impacto:** Agentes A e B ficaram limitados a leitura de arquivos locais, sem capacidade de interação com a aplicação.

---

## 2. Fluxo de Execução

### Codegen ativado inesperadamente
- **Problema:** O modo Codegen foi aberto do nada durante uma etapa, após 2 agentes ficarem travados, interrompendo o processo.
- **Ação necessária:** Investigar o que dispara o Codegen como fallback e se isso é um comportamento intencional ou um bug no orquestrador.

### Agentes travando durante execução
- **Problema:** 2 agentes ficaram travados antes do Codegen ser ativado, causando parada no fluxo.
- **Relação:** Possivelmente ligado ao PA-01 (conflito do Playwright) ou PA-03 (browser bloqueado em background).

---

## 3. Configuração do Projeto

### Repositório de código fonte — onde configurar?
- **Questão:** Falta definição clara de onde, dentro do projeto mcp-e2e, o repositório do código fonte da aplicação sob teste deve ser configurado/referenciado.
- **Impacto:** Quando o repositório não está setado, o agente de exploração de código fonte pode não ser executado.
- **Ação necessária:** Definir um parâmetro obrigatório no `init` ou na configuração do projeto para o caminho/URL do repositório, com validação antes de iniciar o fluxo.

---

## 4. Permissões e Autonomia

### Interações humanas bloqueando o fluxo
- **Problema:** Diversas etapas requerem permissão humana para que o Claude possa implementar os cenários (gravação de arquivos, execução de tools).
- **Ação necessária:** Configurar permissão total (`--dangerously-skip-permissions` ou equivalente) para que o fluxo rode end-to-end sem interrupções manuais, pelo menos em modo de desenvolvimento/teste.

---

## Resumo de Ações Prioritárias

| Prioridade | Ação | Relacionado |
|:---:|---|---|
| 🔴 Alta | Resolver conflito MCP Playwright global vs projeto no `init` | PA-01 |
| 🔴 Alta | Liberar permissões de escrita para subagentes | PA-02 |
| 🟡 Média | Investigar/corrigir browser em `run_in_background` | PA-03 |
| 🟡 Média | Definir config obrigatória para repositório de código fonte | Config |
| 🟡 Média | Remover interações humanas do fluxo automatizado | Permissões |
| 🟢 Baixa | Investigar ativação inesperada do Codegen | Fluxo |
