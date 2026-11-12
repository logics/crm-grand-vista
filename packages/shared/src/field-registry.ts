// Registro dos metadados de campo de cada entidade, chaveado pelo nome da
// tabela. Tabela nova entra aqui com todas as colunas — as que não aparecem,
// como `HIDDEN`. O teste de cobertura (`packages/db/test/field-registry.test.ts`)
// varre o schema e não deixa esquecer.
//
// A flag de super admin não entra: este pacote não a nomeia, e o teste de
// cobertura ignora as colunas que o wrapper de auditoria já trata como só de plataforma.
import { CONTACT_ROLE_LABELS, PERSON_TYPE_LABELS } from './contact.js';
import {
  DOCUMENT_STATUS_LABELS,
  LEVEL_LABELS,
  PRICING_MODE_LABELS,
  VALUATION_BAGS_UNIT_LABELS,
} from './farm.js';
import { municipalityReference } from './region.js';
import { ALQUEIRE_TYPE_NAMES, AREA_DISPLAY_UNIT_LABELS } from './tenant-settings.js';
import { COMMERCIAL_STATUS_MEANINGS } from './vocabulary.js';
import {
  type EntityMeta,
  type FieldMeta,
  type GrammaticalGender,
  HIDDEN, RECORD_COLUMNS,
  columnToProperty,
} from './field-metadata.js';

/** A forma comum dos cadastros auxiliares: o que muda de um para outro é o rótulo e o gênero. */
function vocabularyEntity<const G extends GrammaticalGender, const E extends Record<string, FieldMeta> = {}>(
  label: string,
  gender: G,
  extra?: E,
) {
  return {
    label,
    gender,
    fields: {
      ...RECORD_COLUMNS,
      tenant_id: HIDDEN,
      name: { type: 'text', label: 'Nome' },
      // Só existe para a ordem manual; no cadastro alfabético fica em 0 e ninguém o vê.
      display_order: HIDDEN,
      active: { type: 'boolean', label: gender === 'f' ? 'Ativa' : 'Ativo', gender },
      ...(extra as E),
    },
  } as const satisfies EntityMeta;
}

export const FIELD_REGISTRY = {
  tenants: {
    label: 'Empresa',
    gender: 'f',
    fields: {
      ...RECORD_COLUMNS,
      slug: { type: 'text', label: 'Slug' },
      name: { type: 'text', label: 'Nome' },
      legal_name: { type: 'text', label: 'Razão social', gender: 'f' },
      tax_id: { type: 'text', label: 'CNPJ' },
      blocked: { type: 'boolean', label: 'Bloqueada', gender: 'f' },
    },
  },
  users: {
    label: 'Usuário',
    gender: 'm',
    fields: {
      ...RECORD_COLUMNS,
      name: { type: 'text', label: 'Nome' },
      email: { type: 'text', label: 'E-mail' },
      email_verified: { type: 'boolean', label: 'E-mail verificado' },
      image: { type: 'text', label: 'Foto', gender: 'f' },
      // Muda a cada login: é dado de acesso, não alteração do cadastro.
      last_login_at: HIDDEN,
    },
  },
  memberships: {
    label: 'Vínculo',
    gender: 'm',
    fields: {
      ...RECORD_COLUMNS,
      user_id: { type: 'reference', label: 'Usuário', references: { table: 'users', nameColumn: 'name' } },
      tenant_id: HIDDEN,
      is_default: { type: 'boolean', label: 'Empresa padrão', gender: 'f' },
    },
  },
  access_profiles: {
    label: 'Perfil de acesso',
    gender: 'm',
    fields: {
      ...RECORD_COLUMNS,
      tenant_id: HIDDEN,
      name: { type: 'text', label: 'Nome' },
      description: { type: 'long_text', label: 'Descrição', gender: 'f' },
      is_seeded: { type: 'boolean', label: 'Perfil do sistema' },
    },
  },
  aptitudes: vocabularyEntity('Aptidão', 'f'),
  contact_classifications: vocabularyEntity('Classificação do cliente', 'f'),
  crops: vocabularyEntity('Cultura', 'f'),
  document_categories: vocabularyEntity('Categoria de documento', 'f'),
  lead_sources: vocabularyEntity('Origem do lead', 'f'),
  payment_methods: vocabularyEntity('Forma de pagamento', 'f'),
  purchase_profiles: vocabularyEntity('Perfil de compra', 'm'),
  trading_posts: vocabularyEntity('Praça', 'f'),
  contacts: {
    label: 'Contato',
    gender: 'm',
    fields: {
      ...RECORD_COLUMNS,
      tenant_id: HIDDEN,
      person_type: { type: 'enum', label: 'Tipo de pessoa', options: PERSON_TYPE_LABELS },
      name: { type: 'text', label: 'Nome' },
      legal_name: { type: 'text', label: 'Razão social', gender: 'f' },
      tax_id: { type: 'text', label: 'Documento' },
      email: { type: 'text', label: 'E-mail' },
      phone: { type: 'phone', label: 'Telefone' },
      whatsapp: { type: 'phone', label: 'WhatsApp' },
      classification_id: {
        type: 'reference',
        label: 'Classificação',
        gender: 'f',
        references: { table: 'contact_classifications', nameColumn: 'name' },
      },
      lead_source_id: {
        type: 'reference',
        label: 'Origem do lead',
        gender: 'f',
        references: { table: 'lead_sources', nameColumn: 'name' },
      },
      relationship_origin: { type: 'text', label: 'Origem do relacionamento', gender: 'f' },
      strategic_notes: { type: 'long_text', label: 'Observações estratégicas', gender: 'f' },
      custom_fields: HIDDEN,
    },
  },
  contact_roles: {
    label: 'Papel',
    gender: 'm',
    fields: {
      ...RECORD_COLUMNS,
      tenant_id: HIDDEN,
      contact_id: HIDDEN,
      role: { type: 'enum', label: 'Papel', options: CONTACT_ROLE_LABELS },
    },
  },
  farm_aptitudes: {
    label: 'Aptidão',
    gender: 'f',
    fields: {
      ...RECORD_COLUMNS,
      tenant_id: HIDDEN,
      farm_id: HIDDEN,
      aptitude_id: {
        type: 'reference',
        label: 'Aptidão',
        gender: 'f',
        references: { table: 'aptitudes', nameColumn: 'name' },
      },
    },
  },
  farm_crops: {
    label: 'Cultura',
    gender: 'f',
    fields: {
      ...RECORD_COLUMNS,
      tenant_id: HIDDEN,
      farm_id: HIDDEN,
      crop_id: {
        type: 'reference',
        label: 'Cultura',
        gender: 'f',
        references: { table: 'crops', nameColumn: 'name' },
      },
    },
  },
  farms: {
    label: 'Fazenda',
    gender: 'f',
    fields: {
      ...RECORD_COLUMNS,
      tenant_id: HIDDEN,
      name: { type: 'text', label: 'Nome' },
      municipality_ibge_code: { type: 'reference', label: 'Município', references: municipalityReference },
      trading_post_id: {
        type: 'reference',
        label: 'Praça',
        gender: 'f',
        references: { table: 'trading_posts', nameColumn: 'name' },
      },
      responsible_user_id: {
        type: 'reference',
        label: 'Corretor responsável',
        references: { table: 'users', nameColumn: 'name' },
      },
      total_area_ha: { type: 'area', label: 'Área total', gender: 'f' },
      usable_area_ha: { type: 'area', label: 'Área útil', gender: 'f' },
      commercial_status_id: {
        type: 'reference',
        label: 'Status comercial',
        references: { table: 'commercial_statuses', nameColumn: 'name' },
      },
      sales_potential: { type: 'enum', label: 'Potencial de venda', options: LEVEL_LABELS },
      priority: { type: 'enum', label: 'Prioridade', gender: 'f', options: LEVEL_LABELS },
      water_availability: { type: 'enum', label: 'Disponibilidade hídrica', gender: 'f', options: LEVEL_LABELS },
      irrigation_potential: { type: 'enum', label: 'Potencial de irrigação', options: LEVEL_LABELS },
      productive_potential: { type: 'enum', label: 'Potencial produtivo', options: LEVEL_LABELS },
      distance_to_highway_km: { type: 'number', label: 'Distância até a rodovia', gender: 'f' },
      distance_to_warehouse_km: { type: 'number', label: 'Distância até o armazém' },
      document_status: { type: 'enum', label: 'Situação documental', gender: 'f', options: DOCUMENT_STATUS_LABELS },
      document_notes: { type: 'long_text', label: 'Observação documental', gender: 'f' },
      soil: { type: 'long_text', label: 'Solo' },
      topography: { type: 'long_text', label: 'Topografia', gender: 'f' },
      water: { type: 'long_text', label: 'Água', gender: 'f' },
      historical_productivity: { type: 'long_text', label: 'Produtividade histórica', gender: 'f' },
      infrastructure: { type: 'long_text', label: 'Infraestrutura', gender: 'f' },
      technical_summary: { type: 'long_text', label: 'Resumo técnico' },
      differentials: { type: 'long_text', label: 'Diferenciais' },
      // Coordenadas têm sete casas: o formato de `number` (quatro) as arredondaria.
      latitude: { type: 'text', label: 'Latitude', gender: 'f' },
      longitude: { type: 'text', label: 'Longitude', gender: 'f' },
      pricing_mode: { type: 'enum', label: 'Modo de precificação', options: PRICING_MODE_LABELS },
      asking_price: { type: 'money', label: 'Preço pedido' },
      valuation_bags: { type: 'number', label: 'Avaliação em sacas', gender: 'f' },
      valuation_bags_unit: { type: 'enum', label: 'Unidade da avaliação', gender: 'f', options: VALUATION_BAGS_UNIT_LABELS },
      valuation_bags_alqueire_type: {
        type: 'enum',
        label: 'Tipo de alqueire da avaliação',
        options: ALQUEIRE_TYPE_NAMES,
      },
      valuation_crop_id: {
        type: 'reference',
        label: 'Cultura de referência',
        gender: 'f',
        references: { table: 'crops', nameColumn: 'name' },
      },
      custom_fields: HIDDEN,
    },
  },
  tenant_settings: {
    label: 'Parâmetros da empresa',
    gender: 'm',
    fields: {
      ...RECORD_COLUMNS,
      tenant_id: HIDDEN,
      default_alqueire_type: {
        type: 'enum',
        label: 'Tipo de alqueire padrão',
        options: ALQUEIRE_TYPE_NAMES,
      },
      area_display_unit: {
        type: 'enum',
        label: 'Unidade de exibição de área',
        options: AREA_DISPLAY_UNIT_LABELS,
      },
    },
  },
  trading_post_municipalities: {
    label: 'Município atendido',
    gender: 'm',
    fields: {
      ...RECORD_COLUMNS,
      tenant_id: HIDDEN,
      trading_post_id: {
        type: 'reference',
        label: 'Praça',
        gender: 'f',
        references: { table: 'trading_posts', nameColumn: 'name' },
      },
      municipality_ibge_code: { type: 'reference', label: 'Município', references: municipalityReference },
    },
  },
  commercial_statuses: vocabularyEntity('Status comercial', 'm', {
    system_meaning: { type: 'enum', label: 'Significado', options: COMMERCIAL_STATUS_MEANINGS },
  }),
} as const satisfies Record<string, EntityMeta>;

export type RegisteredTable = keyof typeof FIELD_REGISTRY;

export type EntityField = FieldMeta & {
  /** Nome da coluna no banco: o `field` do `audit_log`. */
  column: string;
  /** Nome camelCase, o das respostas da API e dos formulários. */
  property: string;
};

/** Campos de uma entidade na ordem do formulário, com o nome camelCase derivado. */
export function metaFields({ fields }: EntityMeta): EntityField[] {
  return Object.entries(fields).map(([column, meta]) => ({ ...meta, column, property: columnToProperty(column) }));
}

/** Campos da entidade registrada na ordem do formulário, com o nome camelCase derivado. */
export const entityFields = (table: RegisteredTable): EntityField[] => metaFields(FIELD_REGISTRY[table]);
