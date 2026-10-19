import type { Session } from '@crm/shared';
import {
  cn,
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
  Icon,
  initials,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@crm/ui';
import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { LOGOUT_FAILED_MESSAGE, useLogout } from '../modules/auth/session.js';
import { activeTenantName } from './active-tenant.js';
import { BlockedBadge } from './blocked-badge.js';
import { ErrorMessage } from './error-message.js';
import { switchTenantPath, tenantSwitchState } from './tenant-path.js';

// Menu de conta, na ponta direita da topbar (o `a2-user` do export): avatar,
// nome e a empresa ativa. Abre o seletor de empresa — o único lugar de troca de
// empresa (ADR 0002); nenhum filtro de módulo tem um — e a saída.

/** Valor do item "Sair" na lista: o `_` não cabe em slug, então não colide com empresa. */
const LOGOUT_VALUE = '__logout';

function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      // 36px do export (--space-9 + --space-2)
      className="grid size-[calc(var(--space-9)+var(--space-2))] shrink-0 place-items-center rounded-pill bg-brand-primary-soft text-xs font-semibold text-brand-primary"
    >
      {initials(name)}
    </span>
  );
}

/**
 * Lista só as empresas vinculadas: o super admin, numa empresa sem vínculo, vê
 * o slug dela no gatilho e as dele na lista. Com um vínculo só não há o que
 * trocar, e a seção de empresa não aparece.
 */
export function AccountMenu({ session, slug }: { session: Session; slug: string }) {
  const [open, setOpen] = useState(false);
  const command = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const logout = useLogout();

  const { user, tenants } = session;
  const activeName = activeTenantName(session, slug);

  const switchTo = (target: string) => {
    setOpen(false);
    if (target !== slug) void navigate(switchTenantPath(pathname, target), { state: tenantSwitchState });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        // Abaixo de 1180px só o avatar aparece: o nome acessível não pode depender do texto visível.
        aria-label={`${user.name}, ${activeName}`}
        className={cn(
          'flex min-w-0 cursor-pointer items-center gap-4 rounded-pill py-2 pr-5 pl-2 text-left',
          'transition-control hover:bg-surface-sunken data-[state=open]:bg-surface-sunken',
        )}
      >
        <Avatar name={user.name} />
        <span className="flex min-w-0 flex-col gap-1 leading-tight max-rail:hidden">
          <span className="truncate text-sm font-semibold text-text-heading">{user.name}</span>
          <span className="truncate text-xs text-text-faint">{activeName}</span>
        </span>
        <Icon name="chevron-down" size="sm" className="text-text-faint" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        // 280px (7 × --space-10)
        className="w-[calc(7*var(--space-10))] p-0"
        // O foco vai para a lista: setas e Enter navegam e escolhem desde a abertura.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          command.current?.focus();
        }}
      >
        <div className="flex items-center gap-5 border-b border-border-subtle px-6 py-5">
          <Avatar name={user.name} />
          <span className="flex min-w-0 flex-col gap-1 leading-tight">
            <span className="truncate text-sm font-semibold text-text-heading">{user.name}</span>
            <span className="truncate text-xs text-text-faint">{user.email}</span>
          </span>
        </div>
        <Command
          ref={command}
          tabIndex={-1}
          label="Conta"
          defaultValue={slug}
          className="bg-transparent outline-none focus-visible:shadow-none"
        >
          <CommandList className="max-h-none">
            {tenants.length > 1 && (
              <>
                <CommandGroup heading="Empresa">
                  {tenants.map((tenant) => (
                    <CommandItem
                      key={tenant.slug}
                      value={tenant.slug}
                      aria-current={tenant.slug === slug || undefined}
                      onSelect={switchTo}
                    >
                      <span className="truncate">{tenant.name}</span>
                      {tenant.blocked && <BlockedBadge />}
                      {tenant.slug === slug && <Icon name="check" size="md" className="ml-auto text-brand-primary" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            <CommandItem value={LOGOUT_VALUE} disabled={logout.isPending} onSelect={() => logout.mutate()}>
              <Icon name="log-out" size="md" className="text-text-faint" />
              Sair
            </CommandItem>
          </CommandList>
        </Command>
        {logout.isError && (
          <div className="px-6 pb-5">
            <ErrorMessage>{LOGOUT_FAILED_MESSAGE}</ErrorMessage>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
