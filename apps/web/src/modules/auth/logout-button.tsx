import { Button, type ButtonProps } from '@crm/ui';
import { useLogout } from './session.js';

/** Encerra a sessão na API; sem sessão, as rotas protegidas levam de volta ao login. */
export function LogoutButton(props: Omit<ButtonProps, 'onClick' | 'children'>) {
  const logout = useLogout();
  return (
    <Button variant="secondary" disabled={logout.isPending} onClick={() => logout.mutate()} {...props}>
      Sair
    </Button>
  );
}
