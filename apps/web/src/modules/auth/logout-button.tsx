import { Button, type ButtonProps } from '@crm/ui';
import { ErrorMessage } from '../../shell/error-message.js';
import { LOGOUT_FAILED_MESSAGE, useLogout } from './session.js';

/**
 * Encerra a sessão na API; sem sessão, as rotas protegidas levam de volta ao
 * login. Se a API falhar, a sessão continua aberta — e o usuário precisa saber.
 */
export function LogoutButton(props: Omit<ButtonProps, 'onClick' | 'children'>) {
  const logout = useLogout();
  return (
    <>
      {logout.isError && <ErrorMessage>{LOGOUT_FAILED_MESSAGE}</ErrorMessage>}
      <Button variant="secondary" disabled={logout.isPending} onClick={() => logout.mutate()} {...props}>
        Sair
      </Button>
    </>
  );
}
