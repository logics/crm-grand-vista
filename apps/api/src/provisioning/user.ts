// Cadastro de usuário de empresa existente e de super admin, pelo caminho
// nominal do CLI. Cada cadastro é uma transação só: ou grava tudo, ou nada.
import {
  accessProfiles,
  accounts,
  auditedWrites,
  memberships,
  tenants,
  userProfiles,
  users,
  type Database,
} from '@crm/db';
import { tenantSlugSchema } from '@crm/shared';
import { hashPassword } from 'better-auth/crypto';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { emailSchema, generatePassword } from './credentials.js';
import { ProvisioningError } from './tenant.js';

const nameSchema = z.string().trim().min(1, 'Informe o nome do usuário.');
const userEmailSchema = emailSchema('Informe um e-mail válido para o usuário.');

const createUserSchema = z.object({
  name: nameSchema,
  email: userEmailSchema,
  tenantSlug: tenantSlugSchema,
  profile: z.string().trim().min(1, 'Informe o perfil de acesso.'),
});

export type CreateUserInput = z.input<typeof createUserSchema>;

export interface CreatedUser {
  user: { id: string; name: string; email: string };
  tenant: { id: string; slug: string; name: string };
  profile: string;
  /** Presente só quando o usuário nasceu agora: quem já existia mantém a senha. */
  password: string | null;
  isDefault: boolean;
}

const parse = <T extends z.ZodType>(schema: T, input: unknown): z.output<T> => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new ProvisioningError(parsed.error.issues.map((issue) => issue.message).join(' '));
  return parsed.data;
};

/**
 * Cadastra o usuário na empresa de `tenantSlug` com o perfil de acesso `profile`.
 * E-mail já cadastrado não é recusa: ganha só o vínculo novo e mantém a senha.
 */
export async function createUser(db: Database, input: CreateUserInput): Promise<CreatedUser> {
  const { name, email, tenantSlug, profile } = parse(createUserSchema, input);

  // A empresa ativa da transação precisa ser conhecida antes dela: perfis de
  // acesso estão sob RLS. Por isso o slug é resolvido numa leitura à parte.
  const [found] = await db.semTenant({ reason: 'cli' }, (tx) =>
    tx.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, tenantSlug)),
  );
  if (!found) throw new ProvisioningError(`Não existe empresa com o slug "${tenantSlug}". Nada foi alterado.`);
  const tenantId = found.id;

  // A senha só é gerada (e o hash, caro, calculado) se o usuário for novo.
  const [existing] = await db.semTenant({ reason: 'cli' }, (tx) =>
    tx.select({ id: users.id }).from(users).where(eq(users.email, email)),
  );
  const password = existing ? null : generatePassword();
  const passwordHash = password ? await hashPassword(password) : null;

  return db.semTenant({ reason: 'cli', tenantId }, async (tx) => {
    const [tenant] = await tx
      .select({ id: tenants.id, slug: tenants.slug, name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, tenantId));
    if (!tenant) throw new ProvisioningError(`Não existe empresa com o slug "${tenantSlug}". Nada foi alterado.`);

    const [accessProfile] = await tx
      .select({ id: accessProfiles.id, name: accessProfiles.name })
      .from(accessProfiles)
      .where(eq(accessProfiles.name, profile));
    if (!accessProfile) {
      throw new ProvisioningError(`A empresa "${tenantSlug}" não tem o perfil de acesso "${profile}". Nada foi alterado.`);
    }

    // Autor nulo: ação de CLI. Tudo sob a empresa, inclusive o usuário novo.
    const writes = auditedWrites(tx, { tenantId, userId: null });

    let user: { id: string; name: string; email: string };
    if (passwordHash) {
      user = await writes.insert(users, { name, email });
      // A credencial fica fora do wrapper: o hash da senha não vai para o log.
      await tx.insert(accounts).values({
        userId: user.id,
        accountId: user.id,
        providerId: 'credential',
        password: passwordHash,
      });
    } else {
      const [row] = await tx
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.email, email));
      if (!row) throw new ProvisioningError(`O usuário ${email} deixou de existir. Nada foi alterado.`);
      user = row;
    }

    const userMemberships = await tx
      .select({ tenantId: memberships.tenantId })
      .from(memberships)
      .where(eq(memberships.userId, user.id));
    if (userMemberships.some((membership) => membership.tenantId === tenantId)) {
      throw new ProvisioningError(`O usuário ${email} já tem vínculo com a empresa "${tenantSlug}". Nada foi alterado.`);
    }

    // O primeiro vínculo do usuário é o padrão; os seguintes não.
    const isDefault = userMemberships.length === 0;
    await writes.insert(memberships, { userId: user.id, tenantId, isDefault });
    // Fora do wrapper: `user_profiles` tem chave composta, sem o `id` que ele exige
    // (o mesmo caso de `profile_permissions`). O vínculo do usuário já está auditado.
    await tx.insert(userProfiles).values({ tenantId, userId: user.id, profileId: accessProfile.id });

    return {
      // Quem já existia não tem o nome do cadastro repetido na saída: é o que está no banco.
      user: { id: user.id, name: user.name, email: user.email },
      tenant,
      profile: accessProfile.name,
      password,
      isDefault,
    };
  });
}

const createSuperAdminSchema = z.object({ name: nameSchema, email: userEmailSchema });

export type CreateSuperAdminInput = z.input<typeof createSuperAdminSchema>;

export interface CreatedSuperAdmin {
  id: string;
  name: string;
  email: string;
  password: string;
}

/**
 * Cria um usuário já super admin e sem vínculo algum. A recusa de e-mail
 * existente não diz se ele é super admin: orienta `grant` e só.
 */
export async function createSuperAdmin(db: Database, input: CreateSuperAdminInput): Promise<CreatedSuperAdmin> {
  const { name, email } = parse(createSuperAdminSchema, input);
  const password = generatePassword();
  const passwordHash = await hashPassword(password);

  return db.semTenant({ reason: 'cli' }, async (tx) => {
    const [taken] = await tx.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (taken) {
      throw new ProvisioningError(
        `Já existe um usuário com o e-mail ${email}. Para torná-lo super admin, use "super-admin grant". Nada foi alterado.`,
      );
    }

    // Auditoria de plataforma: sem empresa, autor nulo.
    const user = await auditedWrites(tx, { tenantId: null, userId: null }).insert(users, {
      name,
      email,
      isSuperAdmin: true,
    });
    await tx.insert(accounts).values({
      userId: user.id,
      accountId: user.id,
      providerId: 'credential',
      password: passwordHash,
    });
    return { id: user.id, name: user.name, email: user.email, password };
  });
}
