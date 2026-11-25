import {
  CONTACT_ROLE_LABELS,
  contactListQuerySchema,
  farmListQuerySchema,
  formatPhone,
  municipalityLabel,
  type Contact,
  type ContactDetail,
  type Farm,
} from '@crm/shared';
import { Badge, Card, DataTable, Pagination, useBelowBreakpoint, type DataTableColumn } from '@crm/ui';
import { useId, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useCan } from '../../shell/tenant-access.js';
import { tenantPath } from '../../shell/tenant-path.js';
import { useTenantQuery, useTenantSlug } from '../../shell/tenant-query.js';
import { contactSections } from '../contacts/contact-sections.js';
import { fetchContacts } from '../contacts/contacts-api.js';
import { fetchFarms } from '../farms/farms-api.js';
import { searchVocabularyOptions } from '../settings/vocabulary-source.js';

// Seção "Indicações feitas" da ficha do corretor externo: os contatos e as
// fazendas que ele indicou, em qualquer posição da cadeia e sem mostrar a
// posição. São as listas comuns filtradas por `referrerContactId`, então o
// escopo de dados de quem olha vale sozinho (o Corretor `own` conta só as dele).
// A página de cada bloco é estado local: a URL da ficha não carrega a paginação
// de seções. Sem `fazendas.ver`, o bloco de fazendas nem é montado.

const PAGE_SIZE = 25;

const countLabel = (total: number | undefined, singular: string, plural: string) =>
  total === undefined ? '—' : total === 1 ? `1 ${singular}` : `${total} ${plural}`;

/** Todos os ids de status comercial, inclusive os desativados: a lista de fazendas esconde essas sem o filtro explícito. */
async function fetchAllCommercialStatusIds(slug: string): Promise<string[]> {
  const search = searchVocabularyOptions(slug, 'commercial-statuses', 'filter');
  const { signal } = new AbortController();
  const ids: string[] = [];
  let cursor: string | undefined;
  do {
    const result = await search('', { signal, cursor });
    ids.push(...result.items.map((entry) => entry.id));
    cursor = result.nextCursor;
  } while (cursor);
  return ids;
}

interface BlockProps<Row> {
  title: string;
  count: string;
  state: { isPending: boolean; isError: boolean; data?: { items: Row[]; total: number } };
  errorText: string;
  emptyText: string;
  columns: DataTableColumn<Row>[];
  page: number;
  onPageChange: (page: number) => void;
  onOpen: (row: Row) => void;
}

function Block<Row extends { id: string }>({
  title,
  count,
  state,
  errorText,
  emptyText,
  columns,
  page,
  onPageChange,
  onOpen,
}: BlockProps<Row>) {
  const headingId = useId();
  const mobile = useBelowBreakpoint('mobile');
  let body: ReactNode;
  if (state.isError) body = <p className="text-sm text-text-muted">{errorText}</p>;
  else if (state.isPending || !state.data) body = <p className="text-sm text-text-muted">Carregando…</p>;
  else if (state.data.total === 0) body = <p className="text-sm text-text-muted">{emptyText}</p>;
  else {
    body = (
      <>
        <Card padding="none">
          <DataTable dense columns={columns} rows={state.data.items} onRowClick={onOpen} />
        </Card>
        {state.data.total > PAGE_SIZE && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={state.data.total} compact={mobile} onPageChange={onPageChange} />
        )}
      </>
    );
  }
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={headingId} className="gv-eyebrow">
          {title}
        </h3>
        <span className="text-sm text-text-muted">{count}</span>
      </div>
      {body}
    </section>
  );
}

function ContactsBlock({ record }: { record: ContactDetail }) {
  const slug = useTenantSlug();
  const navigate = useNavigate();
  const mobile = useBelowBreakpoint('mobile');
  const [page, setPage] = useState(1);
  const list = useTenantQuery(['contacts', 'referrals-made', record.id, page], (tenant) =>
    fetchContacts(
      tenant,
      contactListQuerySchema.parse({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        sort: 'name',
        referrerContactId: record.id,
      }),
    ),
  );
  const columns: DataTableColumn<Contact>[] = [
    { key: 'name', label: 'Nome', strong: true, render: (contact) => contact.name },
    { key: 'roles', label: 'Papéis', render: (contact) => contact.roles.map((role) => CONTACT_ROLE_LABELS[role]).join(', ') },
    ...(mobile
      ? []
      : [{ key: 'phone', label: 'Telefone', muted: true, render: (contact: Contact) => formatPhone(contact.phone) ?? '—' }]),
  ];
  return (
    <Block
      title="Contatos"
      count={countLabel(list.data?.total, 'contato', 'contatos')}
      state={list}
      errorText="Não foi possível carregar os contatos."
      emptyText="Nenhum contato indicado."
      columns={columns}
      page={page}
      onPageChange={setPage}
      onOpen={(contact) => navigate(tenantPath(slug, `contacts/${contact.id}`))}
    />
  );
}

const FARMS_ERROR = 'Não foi possível carregar as fazendas.';

function FarmsBlock({ record }: { record: ContactDetail }) {
  const statuses = useTenantQuery(['farms', 'referrals-made', 'statuses'], fetchAllCommercialStatusIds);
  // sem os status a lista esconderia as desativadas em silêncio: erro, nunca a lista sem o filtro
  if (statuses.data === undefined || statuses.data.length === 0) {
    return (
      <Block
        title="Fazendas"
        count="—"
        state={{ isPending: statuses.isPending, isError: !statuses.isPending }}
        errorText={FARMS_ERROR}
        emptyText=""
        columns={[]}
        page={1}
        onPageChange={() => {}}
        onOpen={() => {}}
      />
    );
  }
  return <FarmsList record={record} statusIds={statuses.data} />;
}

function FarmsList({ record, statusIds }: { record: ContactDetail; statusIds: string[] }) {
  const slug = useTenantSlug();
  const navigate = useNavigate();
  const mobile = useBelowBreakpoint('mobile');
  const [page, setPage] = useState(1);
  const list = useTenantQuery(['farms', 'referrals-made', record.id, page, statusIds], (tenant) =>
    fetchFarms(
      tenant,
      farmListQuerySchema.parse({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        sort: 'name',
        referrerContactId: record.id,
        commercialStatusId: statusIds.join(','),
      }),
    ),
  );
  const columns: DataTableColumn<Farm>[] = [
    { key: 'name', label: 'Nome', strong: true, render: (farm) => farm.name },
    { key: 'municipality', label: 'Município', render: (farm) => municipalityLabel(farm.municipality) },
    { key: 'status', label: 'Status', render: (farm) => <Badge size="sm">{farm.commercialStatus.name}</Badge> },
    ...(mobile
      ? []
      : [{ key: 'responsible', label: 'Corretor responsável', muted: true, render: (farm: Farm) => farm.responsible.name }]),
  ];
  return (
    <Block
      title="Fazendas"
      count={countLabel(list.data?.total, 'fazenda', 'fazendas')}
      state={list}
      errorText={FARMS_ERROR}
      emptyText="Nenhuma fazenda indicada."
      columns={columns}
      page={page}
      onPageChange={setPage}
      onOpen={(farm) => navigate(tenantPath(slug, `farms/${farm.id}`))}
    />
  );
}

function ReferralsMadeSection({ record }: { record: ContactDetail }) {
  const canSeeFarms = useCan('fazendas.ver');
  return (
    <div className="flex flex-col gap-6">
      <ContactsBlock record={record} />
      {canSeeFarms && <FarmsBlock record={record} />}
    </div>
  );
}

// Sem `permission` no registro: o bloco de contatos vale para a ficha que o usuário já abriu; o de fazendas se decide por dentro.
contactSections.register({
  key: 'referrals-made',
  title: 'Indicações feitas',
  order: 30,
  roles: ['external_broker'],
  component: ReferralsMadeSection,
});
