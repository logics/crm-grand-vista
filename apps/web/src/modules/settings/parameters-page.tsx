import {
  ALQUEIRE_LABELS,
  ALQUEIRE_TYPES,
  AREA_DISPLAY_UNITS,
  AREA_DISPLAY_UNIT_LABELS,
  type AlqueireType,
  type AreaDisplayUnit,
  type TenantSettings,
} from '@crm/shared';
import { Button, Field, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@crm/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ErrorMessage } from '../../shell/error-message.js';
import { PageHeader } from '../../shell/page-header.js';
import { tenantQueryKey, useTenantSlug } from '../../shell/tenant-query.js';
import { SETTINGS_QUERY_KEY, useTenantSettings } from './display-context.js';
import { api } from '../../lib/api.js';

// Parâmetros da empresa: o tipo de alqueire padrão e a unidade de exibição de
// área. Salvar atualiza a consulta que alimenta a formatação do sistema inteiro.

async function saveSettings(slug: string, json: TenantSettings): Promise<TenantSettings> {
  const response = await api.e[':tenant'].settings.$patch({ param: { tenant: slug }, json });
  if (!response.ok) throw new Error('Não foi possível salvar os parâmetros. Tente de novo.');
  return (await response.json()) as TenantSettings;
}

function ParametersForm({ settings }: { settings: TenantSettings }) {
  const slug = useTenantSlug();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: () => saveSettings(slug, draft),
    onSuccess: (next) => {
      queryClient.setQueryData(tenantQueryKey(slug, ...SETTINGS_QUERY_KEY), next);
      setSaved(true);
    },
  });
  const change = (patch: Partial<TenantSettings>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setSaved(false);
  };

  return (
    <form
      className="flex max-w-md flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <Field label="Tipo de alqueire padrão" hint="Pré-preenche as entradas em alqueire. Não altera valores já gravados.">
        <Select value={draft.defaultAlqueireType} onValueChange={(value) => change({ defaultAlqueireType: value as AlqueireType })}>
          <SelectTrigger aria-label="Tipo de alqueire padrão">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALQUEIRE_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {ALQUEIRE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Unidade de exibição de área" hint="Em alqueire, usa o tipo padrão. A área é sempre gravada em hectares.">
        <Select value={draft.areaDisplayUnit} onValueChange={(value) => change({ areaDisplayUnit: value as AreaDisplayUnit })}>
          <SelectTrigger aria-label="Unidade de exibição de área">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AREA_DISPLAY_UNITS.map((unit) => (
              <SelectItem key={unit} value={unit}>
                {AREA_DISPLAY_UNIT_LABELS[unit]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {save.isError && <ErrorMessage>{save.error.message}</ErrorMessage>}
      {saved && <p role="status">Parâmetros salvos.</p>}
      <div>
        <Button type="submit" disabled={save.isPending}>
          Salvar
        </Button>
      </div>
    </form>
  );
}

export function ParametersPage() {
  const { data, isError } = useTenantSettings();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Parâmetros" />
      {isError && <ErrorMessage>Não foi possível carregar os parâmetros.</ErrorMessage>}
      {data && <ParametersForm settings={data} />}
    </div>
  );
}

