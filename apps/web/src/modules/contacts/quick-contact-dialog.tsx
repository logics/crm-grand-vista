import {
  CONTACT_ROLES,
  CONTACT_ROLES_LABEL,
  CONTACT_ROLE_LABELS,
  FIELD_REGISTRY,
  PERSON_TYPES,
  PERSON_TYPE_LABELS,
  contactNameLabel,
  createContactSchema,
  type Contact,
  type ContactDuplicate,
  type ContactRole,
  type PersonType,
} from '@crm/shared';
import {
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  PhoneInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TaxIdInput,
} from '@crm/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';
import { tenantPath } from '../../shell/tenant-path.js';
import { TextLink } from '../../shell/text-link.js';
import { tenantQueryKey, useTenantSlug } from '../../shell/tenant-query.js';
import { TaxIdTakenError, createContact, fetchDuplicates } from './contacts-api.js';
import { DuplicateWarning } from './duplicate-warning.js';

const FORM_ID = 'quick-contact-form';

type FormValues = z.input<typeof createContactSchema>;

export interface QuickContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Termo buscado no seletor, que vira o nome. */
  initialName: string;
  /** Papel pedido pelo seletor: já vem marcado. */
  role?: ContactRole;
  /** O contato recém-criado, para o seletor devolvê-lo selecionado. */
  onCreated: (contact: Contact) => void;
}

/**
 * Cadastro rápido de contato (nome, tipo de pessoa, documento, telefone e papéis),
 * o mesmo em todo seletor. Passa pelo aviso de duplicata e pelo 409 do documento
 * como o formulário completo. Quem o abre decide o que fazer com o contato criado.
 */
export function QuickContactDialog({ open, onOpenChange, initialName, role, onCreated }: QuickContactDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* montado só aberto: cada abertura começa do zero, com o termo e o papel de agora */}
        <QuickContactForm initialName={initialName} role={role} onCreated={onCreated} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function QuickContactForm({
  initialName,
  role,
  onCreated,
  onCancel,
}: Pick<QuickContactDialogProps, 'initialName' | 'role' | 'onCreated'> & { onCancel: () => void }) {
  const slug = useTenantSlug();
  const queryClient = useQueryClient();
  const [personType, setPersonType] = useState<PersonType>('pf');
  const [matches, setMatches] = useState<ContactDuplicate[]>([]);
  const [taxIdOwner, setTaxIdOwner] = useState<TaxIdTakenError['existing'] | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const skipDuplicateCheck = useRef(false);

  const form = useForm<FormValues, unknown, z.output<typeof createContactSchema>>({
    resolver: zodResolver(createContactSchema),
    defaultValues: { personType: 'pf', name: initialName, taxId: '', phone: '', roles: role ? [role] : [] },
  });
  const { isSubmitting } = form.formState;

  const save = async (values: z.output<typeof createContactSchema>) => {
    setFailure(null);
    setTaxIdOwner(null);
    const confirmed = skipDuplicateCheck.current;
    skipDuplicateCheck.current = false;
    if (!confirmed) {
      // O aviso é conselho: se a consulta falha, o cadastro segue.
      const found = await fetchDuplicates(slug, {
        ...(values.name ? { name: values.name } : {}),
        ...(values.phone ? { phone: values.phone } : {}),
      }).catch((): ContactDuplicate[] => []);
      setMatches(found);
      if (found.length > 0) return;
    }
    setMatches([]);
    try {
      const contact = await createContact(slug, values);
      await queryClient.invalidateQueries({ queryKey: tenantQueryKey(slug, 'contacts') });
      onCreated(contact);
    } catch (error) {
      if (error instanceof TaxIdTakenError) {
        setTaxIdOwner(error.existing);
        form.setError('taxId', { type: 'server', message: error.message }, { shouldFocus: true });
      } else {
        setFailure(error instanceof Error ? error.message : 'Não foi possível salvar. Tente de novo.');
      }
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Cadastrar contato</DialogTitle>
        <DialogDescription>O contato novo volta selecionado. Os demais dados você completa depois, na ficha.</DialogDescription>
      </DialogHeader>
      <DialogBody>
        <form
          id={FORM_ID}
          noValidate
          onSubmit={(event) => {
            // O diálogo abre num portal, mas na árvore React é filho do ContactField: sem isto o submit sobe até o formulário da ficha.
            event.stopPropagation();
            void form.handleSubmit(save)(event);
          }}
          className="flex flex-col gap-6"
        >
          {failure && (
            <p role="alert" className="rounded-input bg-status-danger-bg px-6 py-5 text-sm text-status-danger-fg">
              {failure}
            </p>
          )}
          <DuplicateWarning
            matches={matches}
            form={FORM_ID}
            onSaveAnyway={() => {
              skipDuplicateCheck.current = true;
            }}
            disabled={isSubmitting}
          />
          <Controller
            control={form.control}
            name="personType"
            render={({ field }) => (
              <Field label={FIELD_REGISTRY.contacts.fields.person_type.label}>
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    setPersonType(value as PersonType);
                    field.onChange(value);
                  }}
                >
                  <SelectTrigger aria-label="Tipo de pessoa">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERSON_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {PERSON_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <Field label={contactNameLabel(personType)} error={fieldState.error?.message} required>
                <Input {...field} value={field.value ?? ''} />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="taxId"
            render={({ field, fieldState }) => (
              <Field label={FIELD_REGISTRY.contacts.fields.tax_id.label} error={fieldState.error?.message}>
                <div className="flex flex-col gap-2">
                  <TaxIdInput
                    {...field}
                    personType={personType}
                    value={field.value ?? null}
                    onChange={(value) => {
                      setTaxIdOwner(null);
                      field.onChange(value ?? '');
                    }}
                  />
                  {taxIdOwner && (
                    <TextLink to={tenantPath(slug, `contacts/${taxIdOwner.id}`)} target="_blank">
                      Abrir o cadastro de {taxIdOwner.name}
                    </TextLink>
                  )}
                </div>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="phone"
            render={({ field, fieldState }) => (
              <Field label={FIELD_REGISTRY.contacts.fields.phone.label} error={fieldState.error?.message}>
                <PhoneInput {...field} value={field.value ?? ''} />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="roles"
            render={({ field, fieldState }) => (
              <Field label={CONTACT_ROLES_LABEL} error={fieldState.error?.message} required>
                <div role="group" aria-label={CONTACT_ROLES_LABEL} className="flex flex-wrap gap-6">
                  {CONTACT_ROLES.map((item) => (
                    <label key={item} className="flex items-center gap-2 text-sm text-text-body">
                      <Checkbox
                        aria-label={CONTACT_ROLE_LABELS[item]}
                        checked={field.value.includes(item)}
                        onCheckedChange={(checked) =>
                          field.onChange(checked ? [...field.value, item] : field.value.filter((chosen) => chosen !== item))
                        }
                      />
                      {CONTACT_ROLE_LABELS[item]}
                    </label>
                  ))}
                </div>
              </Field>
            )}
          />
        </form>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" form={FORM_ID} disabled={isSubmitting}>
          Cadastrar contato
        </Button>
      </DialogFooter>
    </>
  );
}
