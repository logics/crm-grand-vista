// @vitest-environment jsdom
import '../support/dom.js';
import {
  AuditTimeline,
  Badge,
  Button,
  Card,
  Checkbox,
  ChecklistItem,
  ChecklistPanel,
  CompatibilityGauge,
  DataTable,
  EmptyState,
  FarmCard,
  Field,
  Icon,
  IconButton,
  Input,
  KanbanBoard,
  OpportunityCard,
  PipelineColumn,
  ProgressBar,
  SearchBar,
  SidebarNav,
  SpecList,
  StageStepper,
  StatCard,
  Tag,
  TopBar,
  Wordmark,
} from '../../src/index.js';
import { describeEveryClassGeneratesCss } from '../support/classes.js';

const buttonVariants = ['primary', 'accent', 'secondary', 'soft', 'dark', 'ghost', 'danger'] as const;
const badgeTones = ['neutral', 'success', 'warning', 'danger', 'info', 'brand', 'gold'] as const;
const iconSizes = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const;

const components = {
  Icon: () => (
    <>
      {iconSizes.map((size) => (
        <Icon key={size} name="tractor" size={size} />
      ))}
    </>
  ),
  Button: () => (
    <>
      {buttonVariants.map((variant) => (
        <Button key={variant} variant={variant} icon="plus" count={2}>
          Cadastrar
        </Button>
      ))}
      <Button size="sm" iconRight="chevron-right">
        Pequeno
      </Button>
      <Button size="lg" block disabled>
        Grande
      </Button>
    </>
  ),
  IconButton: () => (
    <>
      {(['ghost', 'outline', 'soft', 'solid'] as const).map((variant) => (
        <IconButton key={variant} variant={variant} icon="pencil" label="Editar" />
      ))}
      <IconButton size="sm" icon="bell" label="Notificações" dot />
      <IconButton size="lg" icon="x" label="Fechar" disabled />
    </>
  ),
  Badge: () => (
    <>
      {badgeTones.map((tone) => (
        <Badge key={tone} tone={tone} dot icon="check">
          Disponível
        </Badge>
      ))}
      <Badge size="sm">+12%</Badge>
    </>
  ),
  Tag: () => (
    <>
      <Tag icon="map-pin">Alto Paranaíba</Tag>
      <Tag selected onRemove={() => {}}>
        Soja
      </Tag>
    </>
  ),
  Card: () => (
    <>
      {(['default', 'hero', 'inverse', 'sunken'] as const).map((tone) => (
        <Card key={tone} tone={tone} eyebrow="Funil" title="Negociações" subtitle="Hoje" action={<span />}>
          Corpo
        </Card>
      ))}
      <Card accent interactive>
        Destaque
      </Card>
      <Card padding="none">Mídia</Card>
    </>
  ),
  Wordmark: () => (
    <>
      <Wordmark size="body" />
      <Wordmark size="display" tone="light" />
      <Wordmark size="lg" descriptor={false} />
      <Wordmark size="h3" />
      <Wordmark size="h1" />
    </>
  ),
  Input: () => (
    <>
      <Input icon="search" prefix="R$" suffix="/ ha" />
      <Input size="sm" pill aria-invalid disabled />
      <Input size="lg" />
    </>
  ),
  Field: () => (
    <>
      <Field label="Valor por hectare útil" hint="Em R$" required>
        <Input />
      </Field>
      <Field label="E-mail" error="Informe um e-mail válido">
        <Input />
      </Field>
      <Field orientation="horizontal" label="CAR válido" hint="Conferido no SICAR">
        <Checkbox />
      </Field>
      <Field orientation="horizontal" label="Sem dica">
        <Checkbox />
      </Field>
    </>
  ),
  SearchBar: () => (
    <>
      <SearchBar filters={<Tag>Soja</Tag>} />
      <SearchBar bare />
    </>
  ),
  EmptyState: () => (
    <>
      <EmptyState title="Nenhuma fazenda" description="Ajuste os filtros." action={<span />} />
      <EmptyState compact icon="search-x" />
    </>
  ),
  ProgressBar: () => (
    <>
      {(['brand', 'gold', 'success', 'danger'] as const).map((tone) => (
        <ProgressBar key={tone} tone={tone} value={40} label="Due diligence" valueLabel="7 de 12" />
      ))}
      <ProgressBar value={10} height="sm" aria-label="Meta" />
      <ProgressBar value={90} height="lg" aria-label="Ocupação" />
    </>
  ),
  FarmCard: () => (
    <>
      <FarmCard
        name="Fazenda Boa Esperança"
        location="Jaborandi, BA"
        price="R$ 62.000"
        area="1.480 ha"
        specs={[{ icon: 'droplets', value: 'Irrigável' }]}
        status="Disponível"
        featured
        onClick={() => {}}
      />
      <FarmCard name="Três Barras" image="/foto.webp" />
    </>
  ),
  StatCard: () => (
    <>
      {(['default', 'hero', 'dark', 'gold'] as const).map((tone) => (
        <StatCard
          key={tone}
          tone={tone}
          label="Valor em negociação"
          value="R$ 48,2 mi"
          unit="mi"
          delta="+12%"
          icon="trending-up"
          rows={[{ label: 'Soja', value: 'R$ 30 mi' }]}
          footnote="No mês"
        />
      ))}
      {(['success', 'danger', 'neutral'] as const).map((deltaTone) => (
        <StatCard key={deltaTone} label="Vendas" value="12" delta="8%" deltaTone={deltaTone} />
      ))}
    </>
  ),
  CompatibilityGauge: () => (
    <>
      <CompatibilityGauge value={92} size="sm" />
      <CompatibilityGauge value={64} />
      <CompatibilityGauge value={20} size="lg" showLabel={false} />
    </>
  ),
  OpportunityCard: () => (
    <>
      <OpportunityCard
        client="Agro Holding Bertoldi"
        farm="Três Barras"
        value="R$ 18,4 mi"
        probability={75}
        owner="Milson Sousa"
        nextAction="Visita técnica · 28/07"
        onClick={() => {}}
      />
      <OpportunityCard client="Bertoldi" nextAction="Visita técnica" overdue owner={<span />} />
    </>
  ),
  KanbanBoard: () => (
    <KanbanBoard>
      {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const).map((index) => (
        <PipelineColumn key={index} stage="Etapa" index={index} count={1} total="R$ 1 mi">
          {index === 1 ? null : <OpportunityCard client="Bertoldi" />}
        </PipelineColumn>
      ))}
    </KanbanBoard>
  ),
  ChecklistPanel: () => (
    <ChecklistPanel title="Due diligence" done={2} total={5} action={<span />}>
      {(['ok', 'pending', 'blocked', 'empty'] as const).map((state) => (
        <ChecklistItem key={state} state={state} label="Matrícula" meta="12/03" badge="Concluído" action={<span />} />
      ))}
    </ChecklistPanel>
  ),
  AuditTimeline: () => (
    <AuditTimeline
      items={[
        {
          title: 'Cadastro editado',
          date: '24/07',
          detail: 'Revisão',
          author: 'Milson',
          changes: [{ field: 'Preço pedido', from: 'R$ 18 mi', to: 'R$ 16 mi' }],
        },
        { title: 'Fazenda cadastrada', icon: 'plus' },
      ]}
    />
  ),
  SpecList: () => (
    <>
      {([1, 2, 3, 4] as const).map((columns) => (
        <SpecList
          key={columns}
          columns={columns}
          items={[{ label: 'Área', value: '1.480 ha', mono: true }, { label: 'Água' }]}
        />
      ))}
    </>
  ),
  DataTable: () => (
    <>
      <DataTable
        columns={[
          { key: 'name', label: 'Fazenda', strong: true, wrap: true, width: 200 },
          { key: 'area', label: 'Área', mono: true, align: 'right', sorted: 'asc' },
          { key: 'status', label: 'Status', muted: true, align: 'center', sorted: 'desc' },
        ]}
        rows={[
          { id: 1, name: 'Boa Esperança', area: '1.120', status: 'Disponível' },
          { id: 2, name: 'Três Barras', area: '860', status: 'Vendida' },
        ]}
        selected={[2]}
        onRowClick={() => {}}
      />
      <DataTable dense columns={[{ key: 'name', label: 'Fazenda' }]} rows={[]} />
    </>
  ),
  SidebarNav: () => (
    <>
      {[false, true].map((collapsed) => (
        <SidebarNav
          key={String(collapsed)}
          collapsed={collapsed}
          active="fazendas"
          footer={<span />}
          items={[
            { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
            { section: 'Comercial' },
            { id: 'fazendas', label: 'Fazendas', icon: 'tractor', badge: 128 },
            { id: 'pipeline', label: 'Funil', icon: 'kanban', badge: 3 },
          ]}
        />
      ))}
    </>
  ),
  TopBar: () => (
    <>
      <TopBar breadcrumb="Comercial · Fazendas" title="Três Barras" search={<span />} actions={<span />} />
      <TopBar search={<span />} />
    </>
  ),
  StageStepper: () => (
    <>
      <StageStepper stages={['Lead', 'Qualificação', 'Visita']} current={1} />
      <StageStepper stages={['Lead', 'Qualificação', 'Visita']} current={1} onSelect={() => {}} />
      <StageStepper compact stages={['Lead', 'Qualificação', 'Visita']} current={1} onSelect={() => {}} />
    </>
  ),
};

describeEveryClassGeneratesCss('classes dos componentes', components);
