// @vitest-environment jsdom
import '../support/dom.js';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Field,
  Icon,
  IconButton,
  Input,
  ProgressBar,
  SearchBar,
  Tag,
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
};

describeEveryClassGeneratesCss('classes dos componentes', components);
