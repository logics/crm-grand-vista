// Registro dos metadados de campo de cada entidade, chaveado pelo nome da
// tabela. Tabela nova entra aqui com todas as colunas — as que não aparecem,
// como `HIDDEN`. O teste de cobertura (`packages/db/test/field-registry.test.ts`)
// varre o schema e não deixa esquecer.
//
// A flag de super admin não entra: este pacote não a nomeia, e o teste de
// cobertura ignora as colunas que o wrapper de auditoria já trata como só de plataforma.
import { type EntityMeta, type FieldMeta, HIDDEN, RECORD_COLUMNS, columnToProperty } from './field-metadata.js';

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
