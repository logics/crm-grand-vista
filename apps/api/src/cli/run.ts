// Moldura comum dos scripts de CLI: erro esperado vira mensagem e código de
// saída 1; erro inesperado sobe com a pilha, que é o que se quer investigar.
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { InvalidEnvError } from '@crm/shared/env';

/** Recusa prevista, com a mensagem que o operador lê. */
export class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliError';
  }
}

type ErrorClass = new (...args: never[]) => Error;

export async function runCli(main: () => Promise<void>, ...expected: ErrorClass[]): Promise<void> {
  try {
    await main();
  } catch (error) {
    // Argumento desconhecido ou malformado (`parseArgs`) também é do operador.
    const badArgs = (error as { code?: unknown }).code?.toString().startsWith('ERR_PARSE_ARGS') ?? false;
    if (!badArgs && ![CliError, InvalidEnvError, ...expected].some((type) => error instanceof type)) throw error;
    const { message } = error as Error;
    console.error(badArgs ? `Argumento inválido. ${message}` : message);
    process.exitCode = 1;
  }
}

/** Sem terminal não há confirmação explícita: um pipe ou um script não confirma. */
export function requireTty(): void {
  if (!stdin.isTTY) throw new CliError('Este comando exige um terminal interativo para a confirmação.');
}

/** Pede que o operador digite de novo o e-mail; qualquer outra coisa aborta sem alterar nada. */
export async function confirmEmail(email: string): Promise<void> {
  const prompt = createInterface({ input: stdin, output: stdout });
  try {
    const typed = (await prompt.question('Para confirmar, digite o e-mail do usuário: ')).trim();
    if (typed.toLowerCase() !== email) throw new CliError('Confirmação não confere. Nada foi alterado.');
  } finally {
    prompt.close();
  }
}
