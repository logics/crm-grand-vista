import {
  CONTACT_ROLES_LABEL,
  CONTACT_ROLE_LABELS,
  FIELD_REGISTRY,
  abbreviateTaxId,
  contactListQuerySchema,
  type Contact,
} from '@crm/shared';
import { Badge, Button, Card } from '@crm/ui';
import { useNavigate } from 'react-router';
import { ListPage } from '../../listing/list-page.js';
import { PageHeader } from '../../shell/page-header.js';
import { useCan } from '../../shell/tenant-access.js';
import { tenantPath } from '../../shell/tenant-path.js';
import { useTenantSlug } from '../../shell/tenant-query.js';
import { fetchContacts } from './contacts-api.js';

const roleBadges = (contact: Contact) => (
  <span className="flex flex-wrap gap-2">
    {contact.roles.map((role) => (
      <Badge key={role} size="sm">
        {CONTACT_ROLE_LABELS[role]}
      </Badge>
    ))}
  </span>
);

const registeredAt = (contact: Contact) => new Date(contact.createdAt).toLocaleDateString('pt-BR');

/** Lista simples de contatos: nome, papéis e data de cadastro. */
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
          { key: 'name', label: FIELD_REGISTRY.contacts.fields.name.label, strong: true, sortable: true },
          { key: 'roles', label: CONTACT_ROLES_LABEL, render: roleBadges },
          {
            key: 'taxId',
            label: FIELD_REGISTRY.contacts.fields.tax_id.label,
            render: (contact) => abbreviateTaxId(contact.taxId) ?? '—',
          },
          { key: 'createdAt', label: 'Cadastrado em', sortable: true, render: registeredAt },
        ]}
        renderCard={(contact) => (
          <Card title={contact.name} subtitle={roleBadges(contact)} interactive onClick={() => open(contact)} />
        )}
        empty={{
          icon: 'users',
          title: 'Nenhum contato cadastrado',
          description: 'Compradores, proprietários e corretores externos aparecem aqui.',
        }}
      />
    </div>
  );
}
