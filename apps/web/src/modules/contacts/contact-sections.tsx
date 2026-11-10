import { CONTACT_ROLES_LABEL, hasClassification, type VocabularyKey, CONTACT_ROLE_LABELS, FIELD_REGISTRY, PERSON_TYPE_LABELS, contactNameLabel, formatPhone, formatTaxId, hasLegalName, type Contact } from '@crm/shared';
import { SpecList } from '@crm/ui';
import { RecordHistory } from '../../history/record-history.js';
import { createRecordSectionRegistry } from '../../record-sections/record-sections.js';
import { useTenantQuery, useTenantSlug } from '../../shell/tenant-query.js';
import { resolveVocabularyOptions } from '../settings/vocabulary-source.js';
import { fetchContactHistory } from './contacts-api.js';

// Seções da ficha do contato. Cada spec que pendura algo na ficha (perfil de
// compra, fazendas do proprietário, cadeia de indicação) registra a sua aqui,
// com `contactSections.register`, sem editar a página.

export const contactSections = createRecordSectionRegistry<Contact>();

const fields = FIELD_REGISTRY.contacts.fields;

/** Nome da entrada do cadastro auxiliar que o contato guarda por id; vazio enquanto carrega. */
function useVocabularyName(vocabulary: VocabularyKey, id: string | null): string | null {
  const entry = useTenantQuery(['vocabulary-entry', vocabulary, id ?? 'none'], async (slug) =>
    id ? ((await resolveVocabularyOptions(slug, vocabulary)([id]))[0] ?? null) : null,
  );
  return entry.data?.name ?? null;
}

function DataSection({ record }: { record: Contact }) {
  const classification = useVocabularyName('contact-classifications', record.classificationId);
  const leadSource = useVocabularyName('lead-sources', record.leadSourceId);
  return (
    <SpecList
      items={[
        { label: fields.person_type.label, value: PERSON_TYPE_LABELS[record.personType] },
        { label: contactNameLabel(record.personType), value: record.name },
        ...(hasLegalName(record.personType) ? [{ label: fields.legal_name.label, value: record.legalName }] : []),
        { label: fields.tax_id.label, value: record.taxId ? formatTaxId(record.taxId) : null },
        { label: CONTACT_ROLES_LABEL, value: record.roles.map((role) => CONTACT_ROLE_LABELS[role]).join(', ') },
        { label: fields.phone.label, value: formatPhone(record.phone) },
        { label: fields.whatsapp.label, value: formatPhone(record.whatsapp) },
        ...(hasClassification(record.roles) ? [{ label: fields.classification_id.label, value: classification }] : []),
        { label: fields.lead_source_id.label, value: leadSource },
        { label: fields.email.label, value: record.email },
        { label: fields.relationship_origin.label, value: record.relationshipOrigin },
        { label: fields.strategic_notes.label, value: record.strategicNotes },
      ]}
    />
  );
}

function HistorySection({ record }: { record: Contact }) {
  const slug = useTenantSlug();
  return (
    <RecordHistory
      queryKey={['contacts', record.id]}
      fetchPage={(_slug, cursor) => fetchContactHistory(slug, record.id, cursor)}
    />
  );
}

contactSections.register({ key: 'data', title: 'Dados', order: 10, component: DataSection });
contactSections.register({ key: 'record-history', title: 'Histórico de alterações', order: 1000, component: HistorySection });

