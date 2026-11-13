import {
  ALQUEIRE_TYPES,
  ALQUEIRE_TYPE_NAMES,
  FIELD_REGISTRY,
  PRICING_MODES,
  PRICING_MODE_LABELS,
  VALUATION_BAGS_UNITS,
  VALUATION_BAGS_UNIT_LABELS,
  compareDecimal,
  farmFormSchema,
  type AlqueireType,
  type Farm,
  type FarmDuplicate,
  type MunicipalityOption,
  type PricingMode,
  type UpdateFarmInput,
  type ValuationBagsUnit,
} from '@crm/shared';
import {
  AreaInput,
  ConfirmDialog,
  DecimalInput,
  EntityForm,
  type EntityFormField,
  Input,
  MoneyInput,
  MunicipalityPicker,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@crm/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { z } from 'zod';
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
import { createFarm, fetchFarm, fetchFarmDuplicates, updateFarm } from './farms-api.js';

const FORM_ID = 'farm-form';

const fields = FIELD_REGISTRY.farms.fields;

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

type FormValues = z.input<typeof farmFormSchema>;
type PricingFieldName = 'askingPrice' | 'valuationBags' | 'valuationBagsUnit' | 'valuationBagsAlqueireType' | 'valuationCropId';

const NO_PRICE = 'none';

/** O bloco da precificação: as seis colunas, com nulo nas que não pertencem ao modo. */
function pricingBlockOf(values: z.output<typeof farmFormSchema>) {
  const mode = values.pricingMode ?? null;
  const bags = mode === 'bags';
  return {
    pricingMode: mode,
    askingPrice: mode === 'brl' ? (values.askingPrice ?? null) : null,
    valuationBags: bags ? (values.valuationBags ?? null) : null,
    valuationBagsUnit: bags ? (values.valuationBagsUnit ?? null) : null,
    valuationBagsAlqueireType: bags && values.valuationBagsUnit === 'per_alqueire' ? (values.valuationBagsAlqueireType ?? null) : null,
    valuationCropId: bags ? (values.valuationCropId ?? null) : null,
  };
}

const sameDecimal = (a: string | null | undefined, b: string | null | undefined) =>
  a == null || b == null ? (a ?? null) === (b ?? null) : compareDecimal(a, b) === 0;

/** A precificação mudou em relação à salva? Compara valor decimal, não texto (`"7000"` = `"7000.0000"`). */
function pricingChanged(farm: Farm, block: ReturnType<typeof pricingBlockOf>) {
  return (
    block.pricingMode !== farm.pricingMode ||
    !sameDecimal(block.askingPrice, farm.askingPrice) ||
    !sameDecimal(block.valuationBags, farm.valuationBags) ||
    block.valuationBagsUnit !== farm.valuationBagsUnit ||
    block.valuationBagsAlqueireType !== farm.valuationBagsAlqueireType ||
    block.valuationCropId !== (farm.valuationCrop?.id ?? null)
  );
}

/** Tipo de alqueire da avaliação: ao aparecer vazio, vem com o padrão da empresa (editável). */
function AlqueireTypeSelect({
  value,
  fallback,
  onChange,
}: {
  value: AlqueireType | null | undefined;
  fallback: AlqueireType;
  onChange: (type: AlqueireType) => void;
}) {
  useEffect(() => {
    if (!value) onChange(fallback);
    // só ao montar: depois disso o valor é da pessoa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Select value={value ?? fallback} onValueChange={(next) => onChange(next as AlqueireType)}>
      <SelectTrigger aria-label={fields.valuation_bags_alqueire_type.label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ALQUEIRE_TYPES.map((type) => (
          <SelectItem key={type} value={type}>
            {ALQUEIRE_TYPE_NAMES[type]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
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
  // A precificação vai inteira ou não vai: o modo manda no bloco (a API grava as seis colunas num save só).
  const pricing = pricingBlockOf(values);
  if (pricingChanged(farm, pricing)) Object.assign(changes, pricing);
  return changes;
}

function FarmForm({ farm }: { farm: Farm | null }) {
  const slug = useTenantSlug();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useSession().data;
  const scope = useDataScope('fazendas');
  const { areaUnit, alqueireType } = useDisplayContext();
  const back = tenantPath(slug, farm ? `farms/${farm.id}` : 'farms');
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

  // Modo de precificação em tela. Trocar de modo com valor preenchido pede confirmação,
  // porque o conjunto do outro modo é apagado ao salvar (o histórico guarda o anterior).
  const [pricingMode, setPricingMode] = useState<PricingMode | null>(farm?.pricingMode ?? null);
  const [bagsUnit, setBagsUnit] = useState<ValuationBagsUnit | null>(farm?.valuationBagsUnit ?? null);
  const [pendingModeChange, setPendingModeChange] = useState<(() => void) | null>(null);
  // Os campos de preço só existem no modo deles: guardam valor e `onChange` enquanto estão na tela.
  const pricingFields = useRef<Partial<Record<PricingFieldName, { value: unknown; clear: () => void }>>>({});
  const track = (name: PricingFieldName, value: unknown, onChange: (value: null) => void) => {
    pricingFields.current[name] = { value, clear: () => onChange(null) };
  };
  const hasPricingValue = () => {
    const current = pricingFields.current;
    return pricingMode === 'brl' ? !!current.askingPrice?.value : !!current.valuationBags?.value || !!current.valuationCropId?.value;
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
      const pricing = pricingBlockOf(values);
      const { pricingMode: _mode, askingPrice: _price, valuationBags: _bags, valuationBagsUnit: _unit, valuationBagsAlqueireType: _type, valuationCropId: _crop, ...base } = values;
      // Na criação só vai o que o modo usa: sem preço, nada de precificação no corpo.
      const used = Object.fromEntries(Object.entries(pricing).filter(([, value]) => value !== null));
      saved = await createFarm(slug, { ...base, ...used });
    }
    await queryClient.invalidateQueries({ queryKey: tenantQueryKey(slug, 'farms') });
    navigate(tenantPath(slug, `farms/${saved.id}`));
  };

  const bagsFields: EntityFormField<FormValues>[] = [
    {
      name: 'valuationBags',
      label: fields.valuation_bags.label,
      render: (field) => {
        track('valuationBags', field.value, field.onChange);
        return (
          <DecimalInput
            {...field}
            scale={4}
            suffix="sacas"
            value={field.value ?? null}
            onChange={(value) => field.onChange(value)}
          />
        );
      },
    },
    {
      name: 'valuationBagsUnit',
      label: fields.valuation_bags_unit.label,
      render: (field) => {
        track('valuationBagsUnit', field.value, field.onChange);
        return (
          <Select
            value={field.value ?? ''}
            onValueChange={(value) => {
              const unit = value as ValuationBagsUnit;
              setBagsUnit(unit);
              field.onChange(unit);
              // por hectare não tem tipo de alqueire; por alqueire, o campo nasce com o padrão da empresa
              if (unit === 'per_hectare') pricingFields.current.valuationBagsAlqueireType?.clear();
            }}
          >
            <SelectTrigger aria-label={fields.valuation_bags_unit.label} onBlur={field.onBlur}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VALUATION_BAGS_UNITS.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {VALUATION_BAGS_UNIT_LABELS[unit]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
    },
    ...(bagsUnit === 'per_alqueire'
      ? [
          {
            name: 'valuationBagsAlqueireType',
            label: fields.valuation_bags_alqueire_type.label,
            render: (field) => {
              track('valuationBagsAlqueireType', field.value, field.onChange);
              return <AlqueireTypeSelect value={field.value} fallback={alqueireType} onChange={field.onChange} />;
            },
          } satisfies EntityFormField<FormValues>,
        ]
      : []),
    {
      name: 'valuationCropId',
      label: fields.valuation_crop_id.label,
      render: (field) => {
        track('valuationCropId', field.value, field.onChange);
        return (
          <VocabularyField
            vocabulary="crops"
            aria-label={fields.valuation_crop_id.label}
            value={field.value ?? null}
            onChange={(entry) => field.onChange(entry?.id ?? null)}
            onBlur={field.onBlur}
          />
        );
      },
    },
  ];

  const pricingSection: EntityFormField<FormValues>[] = [
    {
      name: 'pricingMode',
      label: fields.pricing_mode.label,
      render: (field) => (
        <Select
          value={field.value ?? NO_PRICE}
          onValueChange={(value) => {
            const next = value === NO_PRICE ? null : (value as PricingMode);
            if (next === pricingMode) return;
            const apply = () => {
              for (const tracked of Object.values(pricingFields.current)) tracked.clear();
              pricingFields.current = {};
              setBagsUnit(null);
              setPricingMode(next);
              field.onChange(next);
            };
            if (hasPricingValue()) setPendingModeChange(() => apply);
            else apply();
          }}
        >
          <SelectTrigger aria-label={fields.pricing_mode.label} onBlur={field.onBlur}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_PRICE}>Sem preço</SelectItem>
            {PRICING_MODES.map((mode) => (
              <SelectItem key={mode} value={mode}>
                {PRICING_MODE_LABELS[mode]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    ...(pricingMode === 'brl'
      ? [
          {
            name: 'askingPrice',
            label: fields.asking_price.label,
            render: (field) => {
              track('askingPrice', field.value, field.onChange);
              return <MoneyInput {...field} value={field.value ?? null} onChange={(value) => field.onChange(value)} />;
            },
          } satisfies EntityFormField<FormValues>,
        ]
      : []),
    ...(pricingMode === 'bags' ? bagsFields : []),
  ];

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
          pricingMode: farm?.pricingMode ?? null,
          askingPrice: farm?.askingPrice ?? null,
          valuationBags: farm?.valuationBags ?? null,
          valuationBagsUnit: farm?.valuationBagsUnit ?? null,
          valuationBagsAlqueireType: farm?.valuationBagsAlqueireType ?? null,
          valuationCropId: farm?.valuationCrop?.id ?? null,
        }}
        onCancel={() => navigate(back)}
        onSubmit={save}
        submitLabel={farm ? 'Salvar alterações' : 'Cadastrar fazenda'}
        sections={[
          {
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
          },
          {
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
          },
          { title: 'Precificação', fields: pricingSection },
        ]}
      />
      <ConfirmDialog
        open={pendingModeChange !== null}
        onOpenChange={(open) => {
          if (!open) setPendingModeChange(null);
        }}
        title="Trocar o modo de precificação?"
        description="O preço informado no modo atual será apagado ao salvar. O histórico de alterações guarda o valor anterior."
        confirmLabel="Trocar modo"
        onConfirm={() => pendingModeChange?.()}
      />
    </div>
  );
}
