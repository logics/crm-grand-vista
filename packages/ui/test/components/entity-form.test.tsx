// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  EntityForm,
  type EntityFormProps,
  type EntityFormSection,
  FormSubmitError,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../src/index.js';

const farmSchema = z.object({
  name: z.string().min(1),
  state: z.string().min(1, 'Escolha um estado'),
  area: z.coerce.number().positive(),
  notes: z.string().optional(),
});

type FarmInput = z.input<typeof farmSchema>;

const defaultValues: FarmInput = { name: '', state: '', area: '', notes: '' };

const sections: EntityFormSection<FarmInput>[] = [
  {
    title: 'Identificação',
    description: 'Como a fazenda aparece nas listas.',
    fields: [
      { name: 'name', label: 'Nome da fazenda', render: (field) => <Input {...field} /> },
      {
        name: 'state',
        label: 'Estado',
        render: ({ ref, value, onChange, onBlur }) => (
          <Select value={String(value)} onValueChange={onChange}>
            <SelectTrigger ref={ref} onBlur={onBlur}>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mg">Minas Gerais</SelectItem>
            </SelectContent>
          </Select>
        ),
      },
    ],
  },
  {
    title: 'Área',
    fields: [
      {
        name: 'area',
        label: 'Área total',
        hint: 'Em hectares',
        render: (field) => <Input {...field} value={String(field.value)} suffix="ha" />,
      },
      { name: 'notes', label: 'Observações', colSpan: 2, render: (field) => <Input {...field} /> },
    ],
  },
];

function renderForm(props: Partial<EntityFormProps<typeof farmSchema>> = {}) {
  const onSubmit = props.onSubmit ?? vi.fn();
  const onCancel = props.onCancel ?? vi.fn();
  render(
    <EntityForm
      aria-label="Cadastro de fazenda"
      schema={farmSchema}
      defaultValues={defaultValues}
      sections={sections}
      {...props}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />,
  );
  return { onSubmit, onCancel, user: userEvent.setup() };
}

const save = () => screen.getByRole('button', { name: 'Salvar' });

describe('EntityForm', () => {
  it('cada seção é uma região com título, e cada campo é nomeado pelo rótulo e descrito pela dica', () => {
    renderForm();
    const identification = screen.getByRole('region', { name: 'Identificação' });
    expect(within(identification).getByRole('textbox', { name: 'Nome da fazenda' })).toBeInTheDocument();
    expect(within(identification).getByText('Como a fazenda aparece nas listas.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Área total' })).toHaveAccessibleDescription('Em hectares');
  });

  it('obrigatório vem do schema: o opcional não é marcado', () => {
    renderForm();
    expect(screen.getByRole('textbox', { name: 'Nome da fazenda' })).toHaveAttribute('aria-required', 'true');
    expect(screen.getByRole('combobox', { name: 'Estado' })).toHaveAttribute('aria-required', 'true');
    expect(screen.getByRole('textbox', { name: 'Observações' })).not.toHaveAttribute('aria-required');
  });

  it('valida pelo schema: marca cada campo inválido com a mensagem em pt-BR e não envia', async () => {
    const { onSubmit, user } = renderForm();
    await user.click(save());

    const name = screen.getByRole('textbox', { name: 'Nome da fazenda' });
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription('Campo obrigatório');
    // a mensagem declarada no schema vence a padrão
    expect(screen.getByRole('combobox', { name: 'Estado' })).toHaveAccessibleDescription('Escolha um estado');
    expect(screen.getByRole('textbox', { name: 'Área total' })).toHaveAccessibleDescription('Campo obrigatório');
    expect(screen.getByRole('textbox', { name: 'Observações' })).not.toHaveAttribute('aria-invalid');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('erro que não é de campo vazio sai na mensagem do zod em pt-BR', async () => {
    const { user } = renderForm();
    await user.type(screen.getByRole('textbox', { name: 'Área total' }), '-3');
    await user.click(save());
    expect(screen.getByRole('textbox', { name: 'Área total' })).toHaveAccessibleDescription('Pequeno demais: esperava que o número fosse > 0');
  });

  it('o foco vai para o primeiro campo inválido', async () => {
    const { user } = renderForm();
    await user.type(screen.getByRole('textbox', { name: 'Nome da fazenda' }), 'Fazenda Três Barras');
    await user.click(save());
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Estado' })).toHaveFocus());
  });

  it('corrigido o campo, o erro some e envia os valores convertidos pelo schema', async () => {
    const { onSubmit, user } = renderForm({
      defaultValues: { name: 'Fazenda Três Barras', state: 'mg', area: '', notes: '' },
    });
    await user.click(save());
    const area = screen.getByRole('textbox', { name: 'Área total' });
    await user.type(area, '1240');
    expect(area).not.toHaveAttribute('aria-invalid');
    await user.click(save());
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Fazenda Três Barras', state: 'mg', area: 1240, notes: '' });
  });

  it('enquanto envia, "Salvar" fica desabilitado; ao terminar, volta', async () => {
    let finish!: () => void;
    const onSubmit = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const { user } = renderForm({
      onSubmit,
      defaultValues: { name: 'Fazenda Três Barras', state: 'mg', area: '1240', notes: '' },
    });
    await user.click(save());
    expect(save()).toBeDisabled();
    expect(screen.getByRole('form', { name: 'Cadastro de fazenda' })).toHaveAttribute('aria-busy', 'true');
    finish();
    await waitFor(() => expect(save()).toBeEnabled());
  });

  it('erro do servidor aparece no topo e marca os campos que ele apontar, focando o primeiro', async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new FormSubmitError('Já existe uma fazenda com esse nome.', { name: 'Nome em uso nesta empresa' }),
    );
    const { user } = renderForm({
      onSubmit,
      defaultValues: { name: 'Fazenda Três Barras', state: 'mg', area: '1240', notes: '' },
    });
    await user.click(save());

    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe uma fazenda com esse nome.');
    const name = screen.getByRole('textbox', { name: 'Nome da fazenda' });
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription('Nome em uso nesta empresa');
    expect(name).toHaveFocus();
    expect(save()).toBeEnabled();
  });

  it('rejeição qualquer vira uma mensagem genérica em pt-BR, sem vazar o texto técnico', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const { user } = renderForm({
      onSubmit,
      defaultValues: { name: 'Fazenda Três Barras', state: 'mg', area: '1240', notes: '' },
    });
    await user.click(save());
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Não foi possível salvar. Tente de novo.');
    expect(alert).not.toHaveTextContent('Failed to fetch');
  });

  it('o erro geral some ao enviar de novo', async () => {
    const onSubmit = vi.fn().mockRejectedValueOnce(new FormSubmitError('Sem conexão com o servidor.')).mockResolvedValue(undefined);
    const { user } = renderForm({
      onSubmit,
      defaultValues: { name: 'Fazenda Três Barras', state: 'mg', area: '1240', notes: '' },
    });
    await user.click(save());
    await screen.findByRole('alert');
    await user.click(save());
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('cancelar com o formulário limpo sai direto', async () => {
    const { onCancel, user } = renderForm();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('cancelar com alterações pede confirmação: continuar editando mantém, descartar sai', async () => {
    const { onCancel, user } = renderForm();
    await user.type(screen.getByRole('textbox', { name: 'Nome da fazenda' }), 'Fazenda');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    const dialog = screen.getByRole('dialog', { name: 'Descartar alterações?' });
    await user.click(within(dialog).getByRole('button', { name: 'Continuar editando' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Nome da fazenda' })).toHaveValue('Fazenda');

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Descartar' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('o aviso de saída fecha com Escape, sem descartar', async () => {
    const { onCancel, user } = renderForm();
    await user.type(screen.getByRole('textbox', { name: 'Nome da fazenda' }), 'Fazenda');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('envia pelo teclado, com Enter num campo', async () => {
    const { onSubmit, user } = renderForm({
      defaultValues: { name: 'Fazenda Três Barras', state: 'mg', area: '1240', notes: '' },
    });
    await user.type(screen.getByRole('textbox', { name: 'Observações' }), 'Sede reformada{Enter}');
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('o rótulo do envio é configurável, começando pelo verbo', () => {
    renderForm({ submitLabel: 'Cadastrar fazenda' });
    expect(screen.getByRole('button', { name: 'Cadastrar fazenda' })).toHaveAttribute('type', 'submit');
  });
});
