import type { PermissionCode } from '@crm/shared';
import { Card } from '@crm/ui';
import type { ComponentType, ReactNode } from 'react';
import { useCan } from '../shell/tenant-access.js';

// Seções registráveis de uma ficha (contato hoje, fazenda depois). Cada seção
// declara chave, título, ordem, a condição de exibição e o componente, que
// recebe o registro. Uma spec acrescenta a sua seção registrando-a no módulo da
// ficha, sem editar a página. Fica fora de `packages/ui` porque depende da
// permissão efetiva da empresa (roteador e TanStack Query), como a `ListPage`.

export interface RecordSection<TRecord> {
  key: string;
  title: ReactNode;
  /** Posição na ficha, crescente; empate fica na ordem do registro. */
  order: number;
  /** Aparece quando o registro tem qualquer um dos papéis. Ausente, em qualquer papel. */
  roles?: readonly string[];
  /** Aparece só para quem tem a permissão. */
  permission?: PermissionCode;
  component: ComponentType<{ record: TRecord }>;
}

export interface RecordSectionRegistry<TRecord> {
  /** Registra uma seção; chave repetida é erro de programação. */
  register(section: RecordSection<TRecord>): void;
  /** As seções, na ordem de exibição. */
  sections(): RecordSection<TRecord>[];
}

export function createRecordSectionRegistry<TRecord>(): RecordSectionRegistry<TRecord> {
  const registered: RecordSection<TRecord>[] = [];
  return {
    register(section) {
      if (registered.some((item) => item.key === section.key)) {
        throw new Error(`Seção "${section.key}" já registrada.`);
      }
      registered.push(section);
    },
    sections: () => [...registered].sort((a, b) => a.order - b.order),
  };
}

/** Se a condição de papéis da seção vale para o registro. */
export const matchesRoles = (section: Pick<RecordSection<unknown>, 'roles'>, recordRoles: readonly string[]) =>
  section.roles === undefined || section.roles.some((role) => recordRoles.includes(role));

function SectionCard<TRecord>({ section, record }: { section: RecordSection<TRecord>; record: TRecord }) {
  const Body = section.component;
  return (
    <Card data-section={section.key} title={section.title}>
      <Body record={record} />
    </Card>
  );
}

/** Separado para que o hook de permissão só rode nas seções que a exigem. */
function PermittedSectionCard<TRecord>({
  section,
  permission,
  record,
}: {
  section: RecordSection<TRecord>;
  permission: PermissionCode;
  record: TRecord;
}) {
  return useCan(permission) ? <SectionCard section={section} record={record} /> : null;
}

export interface RecordSectionsProps<TRecord> {
  registry: RecordSectionRegistry<TRecord>;
  record: TRecord;
  /** Os papéis do registro, contra os quais a condição das seções é avaliada. */
  roles?: readonly string[];
}

export function RecordSections<TRecord>({ registry, record, roles = [] }: RecordSectionsProps<TRecord>) {
  return (
    <div className="flex flex-col gap-gap-shell">
      {registry
        .sections()
        .filter((section) => matchesRoles(section, roles))
        .map((section) =>
          section.permission ? (
            <PermittedSectionCard key={section.key} section={section} permission={section.permission} record={record} />
          ) : (
            <SectionCard key={section.key} section={section} record={record} />
          ),
        )}
    </div>
  );
}
