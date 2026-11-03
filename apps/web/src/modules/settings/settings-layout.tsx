import { vocabulariesByLabel } from '@crm/shared';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SidebarNav, type SidebarNavItem, useBelowBreakpoint } from '@crm/ui';
import { Outlet, useNavigate, useParams } from 'react-router';

const GROUP = 'Cadastros auxiliares';

// O menu vem do registro de cadastros auxiliares: cadastro novo aparece aqui
// sem tocar este arquivo. O registro é estático, então a lista se monta uma vez.
const vocabularies = vocabulariesByLabel();
const items: SidebarNavItem[] = [
  { section: GROUP },
  ...vocabularies.map(({ key, label }) => ({ id: key, label: label.plural, icon: 'sliders-horizontal' as const })),
];

/** Configurações: navegação entre os cadastros e a página do cadastro aberto. */
export function SettingsLayout() {
  const active = useParams().vocabulary;
  const navigate = useNavigate();
  const mobile = useBelowBreakpoint('mobile');
  const open = (key: string) => void navigate(`vocabularies/${key}`, { relative: 'route' });

  return (
    <div className="flex flex-row gap-gap-shell max-mobile:flex-col">
      {mobile ? (
        <Select value={active} onValueChange={open}>
          <SelectTrigger aria-label={GROUP}>
            <SelectValue placeholder={GROUP} />
          </SelectTrigger>
          <SelectContent>
            {vocabularies.map(({ key, label }) => (
              <SelectItem key={key} value={key}>
                {label.plural}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <SidebarNav aria-label="Configurações" items={items} active={active} onSelect={open} className="self-start" />
      )}
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
