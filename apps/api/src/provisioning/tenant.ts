// Provisionamento de empresa: a empresa, os perfis de acesso semeados, o
// primeiro administrador e o vínculo padrão entre eles — tudo numa transação
// só, pelo caminho nominal do CLI. Ou nasce inteira, ou não nasce.
import {
  accounts,
  auditedWrites,
  memberships,
  tenants,
  userProfiles,
  users,
  uuidv7,
  type Database,
} from '@crm/db';
import { tenantNameSchema, tenantSlugSchema } from '@crm/shared';
import { hashPassword } from 'better-auth/crypto';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { emailSchema, generatePassword } from './credentials.js';
import { ADMIN_ACCESS_PROFILE, seedAccessProfiles } from './seeded-access-profiles.js';

export const provisionTenantSchema = z.object({
  slug: tenantSlugSchema,
  name: tenantNameSchema,
  admin: z.object({
    name: z.string().trim().min(1, 'Informe o nome do administrador.'),
    email: emailSchema('Informe um e-mail válido para o administrador.'),
  }),
});

export type ProvisionTenantInput = z.input<typeof provisionTenantSchema>;

export interface ProvisionedTenant {
  tenant: { id: string; slug: string; name: string };
  /** A senha só existe aqui, em claro, uma vez: o banco guarda o hash. */
  admin: { id: string; name: string; email: string; password: string };
}

/** Recusa do provisionamento, com a mensagem que o CLI mostra. Nada foi gravado. */
export class ProvisioningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProvisioningError';
  }
}

export async function provisionTenant(db: Database, input: ProvisionTenantInput): Promise<ProvisionedTenant> {
  const parsed = provisionTenantSchema.safeParse(input);
  if (!parsed.success) throw new ProvisioningError(parsed.error.issues.map((issue) => issue.message).join(' '));
  const { slug, name, admin } = parsed.data;

  // O id nasce antes da empresa para a transação já carregá-lo: perfis de
  // acesso estão sob RLS e só são gravados com a empresa ativa aplicada.
  const tenantId = uuidv7();
  const password = generatePassword();
  const passwordHash = await hashPassword(password);

  return db.semTenant({ reason: 'cli', tenantId }, async (tx) => {
    const [takenSlug] = await tx.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, slug));
    if (takenSlug) throw new ProvisioningError(`Já existe uma empresa com o slug "${slug}". Nada foi alterado.`);

    const [takenEmail] = await tx.select({ id: users.id }).from(users).where(eq(users.email, admin.email));
    if (takenEmail) throw new ProvisioningError(`Já existe um usuário com o e-mail ${admin.email}. Nada foi alterado.`);

    // Autor nulo: ação de CLI. Tudo sob a empresa nova, inclusive o usuário —
    // é ela que o traz para a plataforma.
    const writes = auditedWrites(tx, { tenantId, userId: null });
    const tenant = await writes.insert(tenants, { id: tenantId, slug, name });
    const user = await writes.insert(users, { name: admin.name, email: admin.email });
    // A credencial fica fora do wrapper: o hash da senha não vai para o log.
    await tx.insert(accounts).values({
      userId: user.id,
      accountId: user.id,
      providerId: 'credential',
      password: passwordHash,
    });
    await writes.insert(memberships, { userId: user.id, tenantId, isDefault: true });

    const profiles = await seedAccessProfiles(tx, writes, tenantId);
    const adminProfileId = profiles.get(ADMIN_ACCESS_PROFILE);
    if (!adminProfileId) throw new Error(`O perfil de acesso ${ADMIN_ACCESS_PROFILE} não foi semeado.`);
    await tx.insert(userProfiles).values({ tenantId, userId: user.id, profileId: adminProfileId });

    return {
      tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
      admin: { id: user.id, name: user.name, email: user.email, password },
    };
  });
}
