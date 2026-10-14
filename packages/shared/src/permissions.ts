// Catálogo de permissões: a fonte da verdade, em código. A migration o espelha
// na tabela `permissions` (`syncPermissionCatalog`, em `@crm/db`) — permissão nova
// entra aqui e chega ao banco no próximo `db:migrate`.
//
// Cobre os módulos das seis fases, não só o que já tem rota: é dado, custa nada,
// e evita que cada fase mexa no catálogo e nos perfis semeados junto.
//
// Remover uma permissão daqui NÃO a apaga do banco. Apagar remove por cascata as
// linhas de `profile_permissions`, e uma empresa perderia acesso configurado sem
// que ninguém decidisse isso: a remoção é migration própria, escrita à mão. O
// mesmo vale para mudar o escopo de uma permissão — a sincronização recusa.

/**
 * `tenant` compõe perfil de acesso; `platform` vive fora deles, em
 * `user_platform_permissions`, porque perfil de acesso pertence a uma empresa e
 * não pode conceder poder sobre outra.
 */
export type PermissionScope = 'tenant' | 'platform';

type ModuleDefinition = {
  scope: PermissionScope;
  /** Ação → descrição, como aparece na futura tela de perfis de acesso. */
  actions: Record<string, string>;
};

const MODULES = {
  fazendas: {
    scope: 'tenant',
    actions: {
      ver: 'Ver as fazendas da carteira',
      criar: 'Cadastrar fazendas',
      editar: 'Editar fazendas, inclusive galerias, documentos e campos personalizados',
      excluir: 'Excluir fazendas',
    },
  },
  contatos: {
    scope: 'tenant',
    actions: {
      ver: 'Ver os contatos — compradores, proprietários e corretores externos',
      criar: 'Cadastrar contatos',
      editar: 'Editar contatos, inclusive perfil de compra e cadeia de indicação',
      excluir: 'Excluir contatos',
    },
  },
  oportunidades: {
    scope: 'tenant',
    actions: {
      ver: 'Ver as oportunidades e o funil comercial',
      criar: 'Criar oportunidades',
      editar: 'Editar oportunidades, inclusive mover de etapa no funil e apresentar fazendas candidatas',
      excluir: 'Excluir oportunidades',
      compartilhar: 'Enviar oportunidade de compra a contatos por WhatsApp e e-mail',
    },
  },
  vendas: {
    scope: 'tenant',
    actions: {
      ver: 'Ver as vendas registradas nas oportunidades',
      registrar: 'Registrar a venda de uma fazenda numa oportunidade',
      editar: 'Editar vendas, inclusive parcelas e status da venda',
      excluir: 'Excluir vendas',
    },
  },
  comissao: {
    scope: 'tenant',
    actions: {
      ver_de_terceiros: 'Ver a comissão dos demais participantes e o total da venda, além da própria',
      gerenciar: 'Definir grupos e participantes da comissão e dar baixa nas parcelas',
    },
  },
  matching: {
    scope: 'tenant',
    actions: {
      ver: 'Ver as demandas compatíveis com uma fazenda e as fazendas aderentes a um comprador',
    },
  },
  due_diligence: {
    scope: 'tenant',
    actions: {
      ver: 'Ver os checklists de due diligence e suas pendências',
      gerenciar: 'Preencher os checklists de due diligence e resolver pendências',
    },
  },
  agenda: {
    scope: 'tenant',
    actions: {
      ver: 'Ver a agenda comercial e o histórico de atividades',
      gerenciar: 'Registrar e editar visitas, reuniões, ligações e retornos',
    },
  },
  dashboard: {
    scope: 'tenant',
    actions: {
      ver: 'Ver o dashboard com os indicadores da empresa',
    },
  },
  relatorios: {
    scope: 'tenant',
    actions: {
      ver: 'Ver os relatórios comerciais',
      exportar: 'Exportar relatórios para Excel e PDF',
    },
  },
  auditoria: {
    scope: 'tenant',
    actions: {
      ver: 'Ver o histórico de alterações e os logs de auditoria',
    },
  },
  configuracoes: {
    scope: 'tenant',
    actions: {
      gerenciar:
        'Gerenciar as configurações da empresa: cadastros auxiliares, etapas do funil, impostos, regras de matching e campos personalizados',
    },
  },
  usuarios: {
    scope: 'tenant',
    actions: {
      gerenciar: 'Convidar, editar e desativar os usuários da empresa',
    },
  },
  perfis_de_acesso: {
    scope: 'tenant',
    actions: {
      gerenciar: 'Criar, editar e excluir perfis de acesso e vinculá-los a usuários',
    },
  },
  empresas: {
    scope: 'platform',
    actions: {
      gerenciar: 'Criar, editar e bloquear empresas e vincular usuários a elas',
      ver_todas: 'Ver todas as empresas da plataforma',
    },
  },
} as const satisfies Record<string, ModuleDefinition>;

type Modules = typeof MODULES;
type ModuleName = keyof Modules & string;

/** Código `<modulo>.<acao>` de toda permissão do catálogo. */
export type PermissionCode = {
  [M in ModuleName]: `${M}.${keyof Modules[M]['actions'] & string}`;
}[ModuleName];

export type Permission = {
  code: PermissionCode;
  module: string;
  action: string;
  scope: PermissionScope;
  description: string;
};

export const PERMISSION_CATALOG: readonly Permission[] = Object.entries(MODULES).flatMap(
  ([module, { scope, actions }]) =>
    Object.entries(actions).map(([action, description]) => ({
      code: `${module}.${action}` as PermissionCode,
      module,
      action,
      scope,
      description,
    })),
);
