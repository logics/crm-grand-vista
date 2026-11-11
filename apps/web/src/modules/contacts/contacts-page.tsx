import {
  CONTACT_ROLES_LABEL,
  CONTACT_ROLE_LABELS,
  FIELD_REGISTRY,
  abbreviateTaxId,
  contactListQuerySchema,
  formatPhone,
  type Contact,
} from '@crm/shared';
import { Badge, Button, Card, ContactShortcuts } from '@crm/ui';
import { useNavigate } from 'react-router';
import { ListPage } from '../../listing/list-page.js';
import { PageHeader } from '../../shell/page-header.js';
import { useCan } from '../../shell/tenant-access.js';
import { tenantPath } from '../../shell/tenant-path.js';
import { useTenantSlug } from '../../shell/tenant-query.js';
import { ContactFilters } from './contact-filters.js';
import { fetchContacts } from './contacts-api.js';
import { useVocabularyName } from './vocabulary-name.js';

const roleBadges = (contact: Contact) => (
  <span className="flex flex-wrap gap-2">
    {contact.roles.map((role) => (
      <Badge key={role} size="sm">
        {CONTACT_ROLE_LABELS[role]}
      </Badge>
    ))}
  </span>
);

// Na lista o atalho é o do WhatsApp; ligar e e-mail ficam na ficha.
const whatsappShortcut = (contact: Contact) => <ContactShortcuts name={contact.name} whatsapp={contact.whatsapp} />;

/** Nome do contato; em pessoa jurídica, a razão social aparece abaixo. */
const nameWithLegalName = (contact: Contact) => (
  <span className="flex flex-col">
    <span>{contact.name}</span>
    {contact.personType === 'pj' && contact.legalName && (
      <span className="text-sm font-normal text-text-muted">{contact.legalName}</span>
    )}
  </span>
);

function ClassificationName({ contact }: { contact: Contact }) {
  const name = useVocabularyName('contact-classifications', contact.classificationId);
  return <>{name ?? '—'}</>;
}

const registeredAt = (contact: Contact) => new Date(contact.createdAt).toLocaleDateString('pt-BR');

/** Lista de contatos: busca, filtros, nome, papéis, documento, telefone, classificação, data de cadastro e o atalho de WhatsApp. */
export function ContactsPage() {
  const slug = useTenantSlug();
  const navigate = useNavigate();
  const canCreate = useCan('contatos.criar');
  const open = (contact: Contact) => navigate(tenantPath(slug, `contacts/${contact.id}`));

  return (
    <div className="flex flex-col gap-gap-shell">
      <PageHeader
        title="Contatos"
        action={
          canCreate && (
            <Button icon="plus" onClick={() => navigate(tenantPath(slug, 'contacts/new'))}>
              Novo contato
            </Button>
          )
        }
      />
      <ListPage
        schema={contactListQuerySchema}
        queryKey={['contacts']}
        fetchPage={fetchContacts}
        onRowClick={open}
        searchPlaceholder="Buscar contato"
        columns={[
          { key: 'name', label: FIELD_REGISTRY.contacts.fields.name.label, strong: true, sortable: true, render: nameWithLegalName },
          { key: 'roles', label: CONTACT_ROLES_LABEL, render: roleBadges },
          {
            key: 'taxId',
            label: FIELD_REGISTRY.contacts.fields.tax_id.label,
            render: (contact) => abbreviateTaxId(contact.taxId) ?? '—',
          },
          { key: 'phone', label: FIELD_REGISTRY.contacts.fields.phone.label, render: (contact) => formatPhone(contact.phone) },
          {
            key: 'classification',
            label: FIELD_REGISTRY.contacts.fields.classification_id.label,
            render: (contact) => <ClassificationName contact={contact} />,
          },
          { key: 'createdAt', label: 'Cadastrado em', sortable: true, render: registeredAt },
          { key: 'whatsapp', label: 'WhatsApp', render: whatsappShortcut },
        ]}
        renderCard={(contact) => (
          <Card title={contact.name} subtitle={roleBadges(contact)} action={whatsappShortcut(contact)} interactive onClick={() => open(contact)}>
            {contact.phone && <p className="text-sm text-text-body">{formatPhone(contact.phone)}</p>}
          </Card>
        )}
        empty={{
          icon: 'users',
          title: 'Nenhum contato cadastrado',
          description: 'Compradores, proprietários e corretores externos aparecem aqui.',
        }}
      >
        {(list) => <ContactFilters {...list} />}
      </ListPage>
    </div>
  );
}
