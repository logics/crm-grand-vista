import { INVALID_CREDENTIALS_MESSAGE, loginSchema, type LoginInput } from '@crm/shared';
import { Button, Card, Field, Input, Wordmark } from '@crm/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ErrorMessage } from '../../shell/error-message.js';
import { LandingRedirect } from './landing-redirect.js';
import { InvalidCredentialsError, useLogin, useSession } from './session.js';

// Tela de login: e-mail e senha validados pelo mesmo `loginSchema` da borda
// HTTP. Com sessão aberta — de antes, ou recém-criada pelo envio — leva à
// empresa padrão; o redirecionamento é um só, o de quando a sessão existe.

const UNAVAILABLE_MESSAGE = 'Não foi possível entrar agora. Tente de novo em instantes.';

export function LoginPage() {
  const { data: session, isPending } = useSession();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  if (isPending) return null;
  if (session) return <LandingRedirect session={session} />;

  const formError =
    login.error && (login.error instanceof InvalidCredentialsError ? INVALID_CREDENTIALS_MESSAGE : UNAVAILABLE_MESSAGE);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 p-gap-shell">
      <Wordmark size="h2" />
      {/* 400px de largura útil (10 × --space-10) */}
      <Card className="w-full max-w-[calc(10*var(--space-10))]">
        <form
          noValidate
          className="flex flex-col gap-7"
          onSubmit={handleSubmit((input) => login.mutate(input))}
        >
          <div className="flex flex-col gap-2">
            <h1 className="text-h3 font-semibold tracking-tight text-text-heading">Entrar no CRM</h1>
            <p className="text-sm text-text-faint">Use o e-mail e a senha do seu cadastro.</p>
          </div>
          <Field label="E-mail" error={errors.email?.message}>
            <Input type="email" autoComplete="username" icon="mail" autoFocus {...register('email')} />
          </Field>
          <Field label="Senha" error={errors.password?.message}>
            <Input type="password" autoComplete="current-password" {...register('password')} />
          </Field>
          {formError && <ErrorMessage>{formError}</ErrorMessage>}
          <Button type="submit" size="lg" block disabled={login.isPending}>
            Entrar
          </Button>
        </form>
      </Card>
    </main>
  );
}
