import { CONTACT_ROLE_LABELS } from '@crm/shared';
import { Badge, Button, ContactShortcuts } from '@crm/ui';
import { useNavigate, useParams } from 'react-router';
import { RecordSections } from '../../record-sections/record-sections.js';
import { LoadFailedState, LoadingState } from '../../shell/page-state.js';
import { PageHeader } from '../../shell/page-header.js';
import { useCan } from '../../shell/tenant-access.js';
import { tenantPath } from '../../shell/tenant-path.js';
import { useTenantQuery, useTenantSlug } from '../../shell/tenant-query.js';
import { fetchContact } from './contacts-api.js';
import { contactSections } from './contact-sections.js';

/** Ficha do contato: cabeçalho e as seções registradas. */
export function ContactPage() {
  const slug = useTenantSlug();
  const id = useParams().id ?? '';
  const navigate = useNavigate();
  const canEdit = useCan('contatos.editar');
  const contact = useTenantQuery(['contacts', id], (tenant) => fetchContact(tenant, id));

  if (contact.isPending) return <LoadingState />;
  if (!contact.data) return <LoadFailedState inline title="Não foi possível carregar o contato" onRetry={() => void contact.refetch()} />;
  const record = contact.data;

  return (
    <div className="flex flex-col gap-gap-shell">
      <PageHeader
        title={record.name}
        action={
          canEdit && (
            <Button icon="pencil" onClick={() => navigate(tenantPath(slug, `contacts/${id}/edit`))}>
              Editar
            </Button>
          )
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        {record.roles.map((role) => (
          <Badge key={role}>{CONTACT_ROLE_LABELS[role]}</Badge>
        ))}
        <ContactShortcuts
          className="ml-2"
          name={record.name}
          phone={record.phone}
          whatsapp={record.whatsapp}
          email={record.email}
        />
      </div>
      <RecordSections registry={contactSections} record={record} roles={record.roles} />
    </div>
  );
}
