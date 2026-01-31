
# Plano de Redesign UI/UX e Dashboards com Graficos

## Visao Geral

Este plano abrange uma reformulacao completa da interface do sistema de controle de horas, implementando um design minimalista e criando dashboards ricos com graficos para clientes e administradores.

---

## Fase 1: Fundacao do Design System

### 1.1 Atualizacao de Variaveis CSS (`src/index.css`)

Ajustes para um visual mais clean e minimalista:

- Fundo principal: branco puro (`0 0% 100%`) ou cinza muito suave (`0 0% 98%`)
- Sombras mais sutis e quase imperceptiveis
- Bordas mais finas e discretas
- Remover gradientes excessivos dos botoes primarios
- Ajustar espacamentos com padding mais generoso
- Cores de destaque mais contidas (manter apenas 1 cor primaria para acoes)

### 1.2 Atualizacao do Tailwind Config

- Adicionar utilitarios para sombras mais leves
- Configurar espacamentos extras para layouts mais aerados
- Ajustar fonte para maior legibilidade

---

## Fase 2: Componentes Base

### 2.1 Novo Componente `PeriodFilter`

Criar `src/components/filters/PeriodFilter.tsx`:

```text
+--------------------------------------------------+
|  Periodo: [Contrato Atual v] [01/01] ate [31/01] |
+--------------------------------------------------+
```

Opcoes:
- Contrato atual (default para cliente)
- Mes atual (default para admin)
- Ultimos 30 dias
- Personalizado (de/ate)

### 2.2 Novo Componente `ClientSelector` (Admin)

Criar `src/components/filters/ClientSelector.tsx`:
- Dropdown com busca para selecionar cliente
- Usado no topbar quando admin

### 2.3 Componentes de Grafico

Criar componentes reutilizaveis em `src/components/charts/`:

- `AreaChart.tsx` - Grafico de area para evolucao temporal
- `BarChart.tsx` - Grafico de barras verticais
- `HorizontalBarChart.tsx` - Grafico de barras horizontais (ranking)
- `DonutChart.tsx` - Grafico de rosca para distribuicao

Todos usarao `recharts` (ja instalado) com o wrapper `ChartContainer` existente.

### 2.4 Componente `KPICard` Minimalista

Atualizar `src/components/ui/metric-card.tsx`:
- Design mais clean sem bordas coloridas excessivas
- Icone menor e mais discreto
- Tipografia com hierarquia clara
- Sombra quase imperceptivel

---

## Fase 3: Layout e Navegacao

### 3.1 Sidebar Minimalista

Atualizar `src/components/layout/AppLayout.tsx`:
- Fundo claro (nao mais azul escuro)
- Icones discretos com texto
- Estado ativo sutil (sem cores vibrantes)
- Transicao suave ao colapsar

### 3.2 Topbar Aprimorado

Adicionar ao layout:
- Nome do cliente (para CLIENT_USER) ou seletor de cliente (para ADMIN)
- Filtro de periodo global
- Menu de perfil/logout

### 3.3 PageHeader Simplificado

Atualizar `src/components/layout/PageHeader.tsx`:
- Remover icone grande com gradiente
- Titulo e descricao mais discretos
- Botoes de acao alinhados a direita

---

## Fase 4: Dashboard do Cliente

### 4.1 Estrutura da Pagina

Reescrever `src/pages/client/Dashboard.tsx`:

```text
+----------------------------------------------------------+
| Dashboard                                                 |
| Bem-vindo, [Nome do Cliente]                             |
+----------------------------------------------------------+
|  Filtro de Periodo: [Contrato Atual v] [De] [Ate]        |
+----------------------------------------------------------+
| [KPI]         [KPI]          [KPI]          [KPI]        |
| Horas         Horas          Saldo          Atendimentos |
| Contratadas   Consumidas     Disponivel                  |
+----------------------------------------------------------+
| [Barra de Progresso do Contrato]                         |
+----------------------------------------------------------+
|                                |                          |
| Grafico de Area:              | Grafico de Barras:       |
| Horas Consumidas ao Longo     | Atendimentos por         |
| do Tempo                      | Dia/Semana               |
|                               |                          |
+-------------------------------+--------------------------+
|                                                          |
| Grafico de Barras Horizontais:                          |
| Top Solicitantes por Horas                              |
|                                                          |
+----------------------------------------------------------+
| Ultimos Atendimentos (tabela) | Produtos do Mes (tabela) |
+----------------------------------------------------------+
```

### 4.2 Logica de Dados

- Filtrar tickets por `client_id` do usuario
- Agregar `billed_hours` por `service_date`
- Contar tickets por dia
- Agrupar por `requester_name` para ranking
- Respeitar filtro de periodo selecionado

### 4.3 Queries Agregadas

```sql
-- Consumo por dia
SELECT service_date, SUM(billed_hours) as hours
FROM tickets
WHERE client_id = ? AND service_date BETWEEN ? AND ?
GROUP BY service_date

-- Top solicitantes
SELECT requester_name, SUM(billed_hours) as hours
FROM tickets
WHERE client_id = ? AND service_date BETWEEN ? AND ?
GROUP BY requester_name
ORDER BY hours DESC LIMIT 10
```

---

## Fase 5: Dashboard do Admin

### 5.1 Estrutura da Pagina

Reescrever `src/pages/admin/Dashboard.tsx`:

```text
+----------------------------------------------------------+
| Dashboard Administrativo                                  |
| Visao geral do sistema                                   |
+----------------------------------------------------------+
| Filtros: [Periodo v] [Cliente v] [Status Contrato v]     |
+----------------------------------------------------------+
| [KPI]       [KPI]        [KPI]       [KPI]       [KPI]   |
| Total       Total        Media       Clientes    Contratos|
| Horas       Atendimentos Horas/Atend Ativos      Vencendo |
+----------------------------------------------------------+
|                               |                           |
| Grafico de Barras:            | Grafico de Linha/Area:   |
| Horas por Cliente (Top 10)    | Evolucao do Consumo      |
|                               |                           |
+-------------------------------+---------------------------+
|                               |                           |
| Grafico de Barras:            | Tabela:                  |
| Atendimentos por Cliente      | Contratos a Vencer       |
| (Top 10)                      | (proximos 7 dias)        |
|                               |                           |
+-------------------------------+---------------------------+
| Acoes Rapidas:                                           |
| [+ Atendimento] [+ Produto] [+ Contrato] [Busca Cliente] |
+----------------------------------------------------------+
```

### 5.2 Logica de Dados

- Quando filtro de cliente esta vazio: agregar todos os clientes
- Quando cliente selecionado: filtrar apenas aquele
- Agregar por cliente para rankings
- Calcular media de horas por atendimento

### 5.3 Queries Agregadas

```sql
-- Total de horas e atendimentos por periodo
SELECT SUM(billed_hours), COUNT(*) FROM tickets
WHERE service_date BETWEEN ? AND ?

-- Horas por cliente (Top 10)
SELECT c.name, SUM(t.billed_hours) as hours
FROM tickets t JOIN clients c ON t.client_id = c.id
WHERE service_date BETWEEN ? AND ?
GROUP BY c.id ORDER BY hours DESC LIMIT 10

-- Evolucao do consumo (agrupado por dia)
SELECT service_date, SUM(billed_hours)
FROM tickets
WHERE service_date BETWEEN ? AND ?
GROUP BY service_date ORDER BY service_date

-- Contratos vencendo
SELECT c.*, cl.name FROM contracts c
JOIN clients cl ON c.client_id = cl.id
WHERE c.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
```

---

## Fase 6: Refino das Telas de Lista

### 6.1 Tela de Atendimentos (Admin)

Atualizar `src/pages/admin/Tickets.tsx`:

- Barra superior com filtros inline (periodo, busca, cliente)
- Tabela com colunas: Data, Solicitante, Horas, Descricao (truncada), Acoes (menu dropdown)
- Clique na linha abre drawer/modal com detalhes
- Remover tabs, usar filtro de status no dropdown
- Design de tabela mais clean com zebra sutil

### 6.2 Tela de Atendimentos (Cliente)

Atualizar `src/pages/client/Tickets.tsx`:
- Mesmo padrao visual do admin
- Cards de resumo mais discretos
- Botao "Novo Chamado" mais visivel

### 6.3 Tela de Contratos (Admin)

Atualizar `src/pages/admin/Contracts.tsx`:
- Adicionar visao de calendario (mensal) mostrando contratos como barras
- Destaque visual para contratos vencendo em breve
- Filtros por cliente e status

### 6.4 Demais Telas

Aplicar mesmo padrao visual a:
- `src/pages/admin/Clients.tsx`
- `src/pages/admin/Users.tsx`
- `src/pages/admin/Products.tsx`
- `src/pages/client/Products.tsx`

---

## Fase 7: Pagina de Login

### 7.1 Redesign Clean

Atualizar `src/pages/Login.tsx`:
- Fundo branco ou cinza muito claro
- Card centralizado com sombra minima
- Remover gradiente do icone
- Inputs com borda fina e focus elegante
- Botao primario solido simples

---

## Fase 8: Estados e Feedback

### 8.1 Loading States

Criar skeletons minimalistas para:
- KPI cards
- Graficos
- Tabelas

### 8.2 Empty States

Atualizar `src/components/ui/empty-state.tsx`:
- Ilustracao discreta ou apenas icone
- Mensagens claras em pt-BR
- Acao contextual quando aplicavel

### 8.3 Mensagens de Erro

- Toast discreto para erros
- Mensagens em portugues
- Acoes de retry quando aplicavel

---

## Fase 9: Responsividade

### 9.1 Mobile

- Sidebar colapsavel em hamburger menu
- KPI cards empilhados (1 coluna)
- Graficos ocupam largura total
- Tabelas com scroll horizontal

### 9.2 Tablet

- Sidebar mini (apenas icones)
- KPI cards em 2 colunas
- Graficos lado a lado quando possivel

---

## Resumo de Arquivos a Criar/Modificar

### Novos Arquivos:
- `src/components/filters/PeriodFilter.tsx`
- `src/components/filters/ClientSelector.tsx`
- `src/components/charts/AreaChart.tsx`
- `src/components/charts/BarChart.tsx`
- `src/components/charts/HorizontalBarChart.tsx`
- `src/components/charts/DonutChart.tsx`
- `src/hooks/useDashboardData.ts` (hook para queries agregadas)

### Arquivos a Modificar:
- `src/index.css` (variaveis de cor e espacamento)
- `tailwind.config.ts` (utilitarios extras)
- `src/components/layout/AppLayout.tsx` (sidebar + topbar)
- `src/components/layout/PageHeader.tsx` (simplificar)
- `src/components/ui/metric-card.tsx` (design minimalista)
- `src/components/ui/empty-state.tsx` (refinamentos)
- `src/pages/client/Dashboard.tsx` (reescrever com graficos)
- `src/pages/admin/Dashboard.tsx` (reescrever com graficos)
- `src/pages/admin/Tickets.tsx` (refino UX)
- `src/pages/admin/Contracts.tsx` (adicionar calendario)
- `src/pages/admin/Clients.tsx` (refino visual)
- `src/pages/admin/Users.tsx` (refino visual)
- `src/pages/admin/Products.tsx` (refino visual)
- `src/pages/client/Tickets.tsx` (refino visual)
- `src/pages/client/Products.tsx` (refino visual)
- `src/pages/Login.tsx` (redesign clean)

---

## Consideracoes de Seguranca

- Todas as queries no cliente filtram por `client_id` via RLS
- Admin usa has_role() para validacao server-side
- Nenhuma alteracao nas politicas RLS existentes
- Nenhuma alteracao no schema do banco
- Regra de `billed_hours` inteira minimo 1 permanece intacta

---

## Ordem de Implementacao Sugerida

1. Variaveis CSS e fundacao visual
2. Componentes de grafico reutilizaveis
3. Componente PeriodFilter
4. Dashboard do Cliente com graficos
5. Dashboard do Admin com graficos
6. Sidebar e TopBar
7. Refino das telas de lista (Tickets, Contracts, etc.)
8. Login page
9. Estados de loading e empty
10. Responsividade mobile

