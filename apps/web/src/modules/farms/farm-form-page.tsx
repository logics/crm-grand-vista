import { FIELD_REGISTRY, compareDecimal, farmFormSchema, type Farm, type MunicipalityOption, type UpdateFarmInput } from '@crm/shared';
import { AreaInput, EntityForm, Input, MunicipalityPicker } from '@crm/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef } from 'react';
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
import { createFarm, fetchFarm, updateFarm } from './farms-api.js';

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

  const save = async (values: z.output<typeof farmFormSchema>) => {
    let saved: Farm;
    if (farm) {
      const changes = changesOf(farm, values);
      saved = Object.keys(changes).length > 0 ? await updateFarm(slug, farm.id, changes) : farm;
    } else {
      saved = await createFarm(slug, values);
    }
    await queryClient.invalidateQueries({ queryKey: tenantQueryKey(slug, 'farms') });
    navigate(tenantPath(slug, `farms/${saved.id}`));
  };

  return (
    <div className="flex flex-col gap-gap-shell">
      <PageHeader title={farm ? 'Editar fazenda' : 'Nova fazenda'} />
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
        ]}
      />
    </div>
  );
}
