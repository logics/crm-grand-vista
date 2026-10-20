// Peças de credencial comuns aos scripts de CLI: e-mail normalizado e senha
// gerada pelo sistema. A senha nunca vem de argumento — não ficaria no histórico
// do shell — e só existe em claro uma vez, na saída do comando.
import { randomBytes } from 'node:crypto';
import { z } from 'zod';

/** Senha gerada: 24 caracteres aleatórios, seguros em URL e em terminal. */
export const generatePassword = () => randomBytes(18).toString('base64url');

/** E-mail válido, em minúsculas; `message` nomeia de quem ele é. */
export const emailSchema = (message: string) => z.email(message).transform((email) => email.toLowerCase());
