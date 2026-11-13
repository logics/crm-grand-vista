import {
  DOCUMENT_STATUSES,
  DOCUMENT_STATUS_LABELS,
  FIELD_REGISTRY,
  compareDecimal,
  farmFormSchema,
  type DocumentStatus,
  type Farm,
  type FarmDuplicate,
  type FarmOwnerInput,
  type MunicipalityOption,
  type UpdateFarmInput,
} from '@crm/shared';
import {
  AreaInput,
  EntityForm,
  type EntityFormSection,
  Input,
  LevelSelect,
  MunicipalityPicker,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@crm/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { z } from 'zod';
import { useUnsavedChangesGuard } from '../../lib/use-unsaved-changes-guard.js';
import { useSession } from '../auth/session.js';
import { useDisplayContext } from '../settings/display-context.js';
import { fetchTradingPostSuggestion } from '../settings/trading-post-suggestion.js';
import { VocabularyField } from '../settings/vocabulary-field.js';
import { resolveMunicipalityItems, searchMunicipalities } from '../municipalities/municipality-source.js';
import { UserField } from '../users/user-field.js';
import { PageHeader } from '../../shell/page-header.js';
import { LoadFailedState, LoadingState } from '../../shell/page-state.js';
import { useDataScope } from '../../shell/tenant-access.js';
import { tenantPath } from '../../shell/tenant-path.js';
import { tenantQueryKey, useTenantQuery, useTenantSlug } from '../../shell/tenant-query.js';
import { FarmDuplicateWarning } from './farm-duplicate-warning.js';
import { FarmOwnersField } from './farm-owners-field.js';
import { createFarm, fetchFarm, fetchFarmDuplicates, updateFarm } from './farms-api.js';

const FORM_ID = 'farm-form';

const fields = FIELD_REGISTRY.farms.fields;
const ownersField = { label: 'Proprietários' };

type FormValues = z.input<typeof farmFormSchema>;
type FormSection = EntityFormSection<FormValues>;

const LEVEL_FIELDS = ['salesPotential', 'priority', 'waterAvailability', 'irrigationPotential', 'productivePotential'] as const;
const TEXT_FIELDS = [
  'documentNotes',
  'soil',
  'topography',
  'water',
  'historicalProductivity',
  'infrastructure',
  'technicalSummary',
  'differentials',
] as const;
const DECIMAL_FIELDS = ['distanceToHighwayKm', 'distanceToWarehouseKm'] as const;

// Radix não aceita `value=""` em item: "Não informado" usa este sentinela.
const NOT_INFORMED = 'none';

/** Situação documental: lista fechada com "Não informado" (nulo). */
function DocumentStatusSelect({
  value,
  onChange,
  onBlur,
  label,
}: {
  value: DocumentStatus | null;
  onChange: (value: DocumentStatus | null) => void;
  onBlur: () => void;
  label: string;
}) {
  return (
    <Select value={value ?? NOT_INFORMED} onValueChange={(next) => onChange(next === NOT_INFORMED ? null : (next as DocumentStatus))}>
      <SelectTrigger aria-label={label} onBlur={onBlur}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NOT_INFORMED}>Não informado</SelectItem>
        {DOCUMENT_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {DOCUMENT_STATUS_LABELS[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Texto digitado de um decimal: vírgula vira ponto e vazio vira nulo (o schema confere o formato). */
const decimalText = (typed: string) => typed.trim().replace(',', '.') || null;

const sameIds = (a: readonly string[], b: readonly string[]) => {
  const left = [...a].sort();
  const right = [...b].sort();
  return left.length === right.length && left.every((id, index) => id === right[index]);
};

/** Formulário de criação (`/farms/new`) e edição (`/farms/:id/edit`). */
export function FarmFormPage() {
  const id = useParams().id;
  const farm = useTenantQuery(['farms', id ?? 'new'], async (slug) => (id ? fetchFarm(slug, id) : null));

  if (farm.isPending) return <LoadingState />;
  if (farm.data === undefined) {
    return <LoadFailedState inline title="Não foi possível carregar a fazenda" onRetry={() => void farm.refetch()} />;
  }
  return <FarmForm farm={farm.data} />;
}

/** O que mudou em relação à fazenda salva: a área só vai se foi editada (sem deriva na ida e volta por alqueire). */
function changesOf(farm: Farm, values: z.output<typeof farmFormSchema>): UpdateFarmInput {
  const sameArea = (a: string | null | undefined, b: string | null | undefined) =>
    a == null || b == null ? (a ?? null) === (b ?? null) : compareDecimal(a, b) === 0;
  const changes: UpdateFarmInput = {};
  if (values.name !== farm.name) changes.name = values.name;
  if (values.municipalityIbgeCode !== farm.municipality.ibgeCode) changes.municipalityIbgeCode = values.municipalityIbgeCode;
  if (values.responsibleUserId && values.responsibleUserId !== farm.responsible.id) {
    changes.responsibleUserId = values.responsibleUserId;
  }
  if ((values.tradingPostId ?? null) !== (farm.tradingPost?.id ?? null)) changes.tradingPostId = values.tradingPostId ?? null;
  if (!sameArea(values.totalAreaHa, farm.totalAreaHa)) changes.totalAreaHa = values.totalAreaHa;
  if (!sameArea(values.usableAreaHa, farm.usableAreaHa)) changes.usableAreaHa = values.usableAreaHa ?? null;
  if (ownersChanged(farm.owners, values.owners)) changes.owners = values.owners;
  if (values.commercialStatusId && values.commercialStatusId !== farm.commercialStatus.id) {
    changes.commercialStatusId = values.commercialStatusId;
  }
  for (const key of [...LEVEL_FIELDS, ...TEXT_FIELDS, 'documentStatus'] as const) {
    if ((values[key] ?? null) !== farm[key]) Object.assign(changes, { [key]: values[key] ?? null });
  }
  for (const key of DECIMAL_FIELDS) {
    if (!sameArea(values[key], farm[key])) changes[key] = values[key] ?? null;
  }
  // O par vai junto: um lado só no PATCH seria recusado se o outro ficasse nulo.
  if (!sameArea(values.latitude, farm.latitude) || !sameArea(values.longitude, farm.longitude)) {
    changes.latitude = values.latitude ?? null;
    changes.longitude = values.longitude ?? null;
  }
  // O conjunto só vai se mudou: abrir e salvar sem mexer não gera PATCH nem histórico.
  if (!sameIds(values.aptitudeIds ?? [], farm.aptitudes.map((item) => item.id))) changes.aptitudeIds = values.aptitudeIds ?? [];
  if (!sameIds(values.cropIds ?? [], farm.crops.map((item) => item.id))) changes.cropIds = values.cropIds ?? [];
  return changes;
}

/** Se o conjunto ou o principal mudou, sem olhar a ordem. */
function ownersChanged(saved: Farm['owners'], desired: readonly FarmOwnerInput[]): boolean {
  if (saved.length !== desired.length) return true;
  const primaryByContact = new Map(saved.map((owner) => [owner.contactId, owner.isPrimary]));
  return desired.some((owner) => primaryByContact.get(owner.contactId) !== owner.isPrimary);
}

function FarmForm({ farm }: { farm: Farm | null }) {
  const slug = useTenantSlug();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useSession().data;
  const scope = useDataScope('fazendas');
  const { areaUnit, alqueireType } = useDisplayContext();
  const back = tenantPath(slug, farm ? `farms/${farm.id}` : 'farms');
  const [dirty, setDirty] = useState(false);
  const guard = useUnsavedChangesGuard(dirty);
  const me = session?.user;

  // A praça é sugerida pelo município enquanto a pessoa não a escolheu à mão
  // nesta edição; depois disso, trocar o município não a sobrescreve. O campo
  // da praça entrega o seu `onChange` aqui, a cada renderização.
  const tradingPostChosenByHand = useRef(false);
  const setTradingPost = useRef<(id: string | null) => void>(() => undefined);
  const searchMunicipality = useMemo(() => searchMunicipalities(slug), [slug]);
  const resolveMunicipality = useMemo(() => resolveMunicipalityItems(slug), [slug]);

  const suggestTradingPost = async (municipality: MunicipalityOption | null) => {
    if (!municipality || tradingPostChosenByHand.current) return;
    // A sugestão é conselho: se a consulta falha, o cadastro segue sem ela.
    const { tradingPost } = await fetchTradingPostSuggestion(slug, municipality.ibgeCode).catch(() => ({ tradingPost: null }));
    if (tradingPost && !tradingPostChosenByHand.current) setTradingPost.current(tradingPost.id);
  };

  const [matches, setMatches] = useState<FarmDuplicate[]>([]);
  const skipDuplicateCheck = useRef(false);

  const save = async (values: z.output<typeof farmFormSchema>) => {
    const confirmed = skipDuplicateCheck.current;
    skipDuplicateCheck.current = false;
    if (!confirmed) {
      // O aviso é conselho: se a consulta falha, o cadastro segue.
      const found = await fetchFarmDuplicates(slug, {
        name: values.name,
        municipalityIbgeCode: values.municipalityIbgeCode,
        ...(farm ? { excludeId: farm.id } : {}),
      }).catch((): FarmDuplicate[] => []);
      setMatches(found);
      if (found.length > 0) return;
    }
    setMatches([]);
    let saved: Farm;
    if (farm) {
      const changes = changesOf(farm, values);
      saved = Object.keys(changes).length > 0 ? await updateFarm(slug, farm.id, changes) : farm;
    } else {
      saved = await createFarm(slug, values);
    }
    await queryClient.invalidateQueries({ queryKey: tenantQueryKey(slug, 'farms') });
    guard.release();
    navigate(tenantPath(slug, `farms/${saved.id}`));
  };

  // Uma seção por constante, compostas em ordem: seção nova (proprietários,
  // precificação) entra por inserção nesta lista, sem mexer nas outras.
  const identification: FormSection = {
    id: 'identificacao',
    title: 'Identificação',
    fields: [
      {
        name: 'name',
        label: fields.name.label,
        colSpan: 2,
        render: (field) => <Input {...field} value={field.value ?? ''} />,
      },
      {
        name: 'municipalityIbgeCode',
        label: fields.municipality_ibge_code.label,
        render: (field) => (
          <MunicipalityPicker
            aria-label={fields.municipality_ibge_code.label}
            value={field.value || null}
            search={searchMunicipality}
            resolve={resolveMunicipality}
            onChange={(municipality) => {
              field.onChange(municipality?.ibgeCode ?? '');
              void suggestTradingPost(municipality);
            }}
            onBlur={field.onBlur}
          />
        ),
      },
      {
        name: 'tradingPostId',
        label: fields.trading_post_id.label,
        render: (field) => {
          setTradingPost.current = field.onChange;
          return (
            <VocabularyField
              vocabulary="trading-posts"
              aria-label={fields.trading_post_id.label}
              value={field.value ?? null}
              onChange={(entry) => {
                tradingPostChosenByHand.current = true;
                field.onChange(entry?.id ?? null);
              }}
              onBlur={field.onBlur}
            />
          );
        },
      },
      {
        name: 'responsibleUserId',
        label: fields.responsible_user_id.label,
        // Com escopo `own` só se atribui a si mesmo: o campo vem travado no próprio usuário.
        render: (field) =>
          scope === 'own' ? (
            <Input
              readOnly
              aria-label={fields.responsible_user_id.label}
              value={farm?.responsible.name ?? me?.name ?? ''}
              onBlur={field.onBlur}
            />
          ) : (
            <UserField
              aria-label={fields.responsible_user_id.label}
              // '' (campo limpo) é vazio, não um ID a hidratar: senão o seletor trava em "Carregando…"
              value={field.value || null}
              onChange={(user) => field.onChange(user?.id ?? '')}
              onBlur={field.onBlur}
            />
          ),
      },
    ],
  };

  const owners: FormSection = {
    title: 'Proprietários',
    fields: [
      {
        name: 'owners',
        label: ownersField.label,
        colSpan: 2,
        render: (field) => (
          <FarmOwnersField
            value={field.value ?? []}
            onChange={field.onChange}
            names={new Map(farm?.owners.map((owner) => [owner.contactId, owner.name]))}
          />
        ),
      },
    ],
  };

  const areas: FormSection = {
    id: 'areas',
    title: 'Áreas',
    fields: [
      {
        name: 'totalAreaHa',
        label: fields.total_area_ha.label,
        render: (field) => (
          <AreaInput
            {...field}
            unit={areaUnit === 'ha' ? 'hectare' : 'alqueire'}
            alqueireType={alqueireType}
            value={field.value ?? null}
            onChange={(value) => field.onChange(value ?? '')}
          />
        ),
      },
      {
        name: 'usableAreaHa',
        label: fields.usable_area_ha.label,
        render: (field) => (
          <AreaInput
            {...field}
            unit={areaUnit === 'ha' ? 'hectare' : 'alqueire'}
            alqueireType={alqueireType}
            value={field.value ?? null}
            onChange={(value) => field.onChange(value)}
          />
        ),
      },
    ],
  };

  const commercial: FormSection = {
    id: 'comercial',
    title: 'Comercial',
    fields: [
      {
        name: 'commercialStatusId',
        label: fields.commercial_status_id.label,
        render: (field) => (
          <VocabularyField
            vocabulary="commercial-statuses"
            aria-label={fields.commercial_status_id.label}
            value={field.value ?? null}
            onChange={(entry) => field.onChange(entry?.id)}
            onBlur={field.onBlur}
          />
        ),
      },
      {
        name: 'salesPotential',
        label: fields.sales_potential.label,
        render: (field) => (
          <LevelSelect aria-label={fields.sales_potential.label} value={field.value ?? null} onChange={field.onChange} onBlur={field.onBlur} />
        ),
      },
      {
        name: 'priority',
        label: fields.priority.label,
        render: (field) => (
          <LevelSelect aria-label={fields.priority.label} value={field.value ?? null} onChange={field.onChange} onBlur={field.onBlur} />
        ),
      },
    ],
  };

  const technical: FormSection = {
    id: 'tecnico',
    title: 'Técnico',
    fields: [
      {
        name: 'aptitudeIds',
        label: 'Aptidões',
        colSpan: 2,
        render: (field) => (
          <VocabularyField
            multiple
            vocabulary="aptitudes"
            aria-label="Aptidões"
            value={field.value ?? []}
            onChange={(entries) => field.onChange(entries.map((entry) => entry.id))}
            onBlur={field.onBlur}
          />
        ),
      },
      {
        name: 'cropIds',
        label: 'Culturas',
        colSpan: 2,
        render: (field) => (
          <VocabularyField
            multiple
            vocabulary="crops"
            aria-label="Culturas"
            value={field.value ?? []}
            onChange={(entries) => field.onChange(entries.map((entry) => entry.id))}
            onBlur={field.onBlur}
          />
        ),
      },
      {
        name: 'waterAvailability',
        label: fields.water_availability.label,
        render: (field) => (
          <LevelSelect aria-label={fields.water_availability.label} value={field.value ?? null} onChange={field.onChange} onBlur={field.onBlur} />
        ),
      },
      {
        name: 'irrigationPotential',
        label: fields.irrigation_potential.label,
        render: (field) => (
          <LevelSelect aria-label={fields.irrigation_potential.label} value={field.value ?? null} onChange={field.onChange} onBlur={field.onBlur} />
        ),
      },
      {
        name: 'productivePotential',
        label: fields.productive_potential.label,
        render: (field) => (
          <LevelSelect aria-label={fields.productive_potential.label} value={field.value ?? null} onChange={field.onChange} onBlur={field.onBlur} />
        ),
      },
      {
        name: 'distanceToHighwayKm',
        label: fields.distance_to_highway_km.label,
        render: (field) => (
          <Input
            inputMode="decimal"
            suffix="km"
            name={field.name}
            ref={field.ref}
            value={field.value ?? ''}
            onChange={(event) => field.onChange(decimalText(event.target.value))}
            onBlur={field.onBlur}
          />
        ),
      },
      {
        name: 'distanceToWarehouseKm',
        label: fields.distance_to_warehouse_km.label,
        render: (field) => (
          <Input
            inputMode="decimal"
            suffix="km"
            name={field.name}
            ref={field.ref}
            value={field.value ?? ''}
            onChange={(event) => field.onChange(decimalText(event.target.value))}
            onBlur={field.onBlur}
          />
        ),
      },
      {
        name: 'documentStatus',
        label: fields.document_status.label,
        render: (field) => (
          <DocumentStatusSelect
            label={fields.document_status.label}
            value={field.value ?? null}
            onChange={field.onChange}
            onBlur={field.onBlur}
          />
        ),
      },
      {
        name: 'documentNotes',
        label: fields.document_notes.label,
        colSpan: 2,
        render: (field) => <Input {...field} value={field.value ?? ''} />,
      },
      {
        name: 'soil',
        label: fields.soil.label,
        colSpan: 2,
        render: (field) => <Input {...field} value={field.value ?? ''} />,
      },
      {
        name: 'topography',
        label: fields.topography.label,
        colSpan: 2,
        render: (field) => <Input {...field} value={field.value ?? ''} />,
      },
      {
        name: 'water',
        label: fields.water.label,
        colSpan: 2,
        render: (field) => <Input {...field} value={field.value ?? ''} />,
      },
      {
        name: 'historicalProductivity',
        label: fields.historical_productivity.label,
        colSpan: 2,
        render: (field) => <Input {...field} value={field.value ?? ''} />,
      },
      {
        name: 'infrastructure',
        label: fields.infrastructure.label,
        colSpan: 2,
        render: (field) => <Input {...field} value={field.value ?? ''} />,
      },
      {
        name: 'technicalSummary',
        label: fields.technical_summary.label,
        colSpan: 2,
        render: (field) => <Input {...field} value={field.value ?? ''} />,
      },
      {
        name: 'differentials',
        label: fields.differentials.label,
        colSpan: 2,
        render: (field) => <Input {...field} value={field.value ?? ''} />,
      },
      {
        name: 'latitude',
        label: fields.latitude.label,
        render: (field) => (
          <Input
            inputMode="decimal"
            suffix="°"
            name={field.name}
            ref={field.ref}
            value={field.value ?? ''}
            onChange={(event) => field.onChange(decimalText(event.target.value))}
            onBlur={field.onBlur}
          />
        ),
      },
      {
        name: 'longitude',
        label: fields.longitude.label,
        render: (field) => (
          <Input
            inputMode="decimal"
            suffix="°"
            name={field.name}
            ref={field.ref}
            value={field.value ?? ''}
            onChange={(event) => field.onChange(decimalText(event.target.value))}
            onBlur={field.onBlur}
          />
        ),
      },
    ],
  };

  const sections: FormSection[] = [identification, owners, areas, commercial, technical];

  return (
    <div className="flex flex-col gap-gap-shell">
      <PageHeader title={farm ? 'Editar fazenda' : 'Nova fazenda'} />
      <FarmDuplicateWarning
        matches={matches}
        form={FORM_ID}
        onSaveAnyway={() => {
          skipDuplicateCheck.current = true;
        }}
      />
      <EntityForm
        id={FORM_ID}
        schema={farmFormSchema}
        defaultValues={{
          name: farm?.name ?? '',
          municipalityIbgeCode: farm?.municipality.ibgeCode ?? '',
          tradingPostId: farm?.tradingPost?.id ?? null,
          responsibleUserId: farm?.responsible.id ?? me?.id ?? '',
          totalAreaHa: farm?.totalAreaHa ?? '',
          usableAreaHa: farm?.usableAreaHa ?? null,
          owners: farm?.owners.map(({ contactId, isPrimary }) => ({ contactId, isPrimary })) ?? [],
          commercialStatusId: farm?.commercialStatus.id,
          salesPotential: farm?.salesPotential ?? null,
          priority: farm?.priority ?? null,
          waterAvailability: farm?.waterAvailability ?? null,
          irrigationPotential: farm?.irrigationPotential ?? null,
          productivePotential: farm?.productivePotential ?? null,
          distanceToHighwayKm: farm?.distanceToHighwayKm ?? null,
          distanceToWarehouseKm: farm?.distanceToWarehouseKm ?? null,
          documentStatus: farm?.documentStatus ?? null,
          documentNotes: farm?.documentNotes ?? '',
          soil: farm?.soil ?? '',
          topography: farm?.topography ?? '',
          water: farm?.water ?? '',
          historicalProductivity: farm?.historicalProductivity ?? '',
          infrastructure: farm?.infrastructure ?? '',
          technicalSummary: farm?.technicalSummary ?? '',
          differentials: farm?.differentials ?? '',
          latitude: farm?.latitude ?? null,
          longitude: farm?.longitude ?? null,
          aptitudeIds: farm?.aptitudes.map((item) => item.id) ?? [],
          cropIds: farm?.crops.map((item) => item.id) ?? [],
        }}
        onDirtyChange={setDirty}
        onCancel={() => {
          // O EntityForm já confirmou o descarte: o guarda não pergunta de novo.
          guard.release();
          navigate(back);
        }}
        onSubmit={save}
        submitLabel={farm ? 'Salvar alterações' : 'Cadastrar fazenda'}
        sections={sections}
      />
      {guard.dialog}
    </div>
  );
}
