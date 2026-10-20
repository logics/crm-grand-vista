// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { DateRangePicker, type DateRangeValue, Field } from '../../src/index.js';

const today = new Date(2026, 9, 20);

function Controlled({ initial = {} }: { initial?: DateRangeValue }) {
  const [value, setValue] = useState<DateRangeValue>(initial);
  return (
    <>
      <DateRangePicker aria-label="Período" today={today} value={value} onChange={setValue} />
      <output aria-label="valor">{JSON.stringify(value)}</output>
    </>
  );
}

const from = () => screen.getByRole('textbox', { name: 'Data inicial' });
const to = () => screen.getByRole('textbox', { name: 'Data final' });
const value = () => screen.getByLabelText('valor').textContent;
// âncora no número: sem ela, "5 de outubro" também casa com "15 de outubro"
const day = (label: RegExp) =>
  screen.getByRole('button', { name: new RegExp(`(?:^|\\D)${label.source}`) });

describe('DateRangePicker', () => {
  it('mostra início → fim no formato dd/mm/aaaa', () => {
    render(<DateRangePicker aria-label="Período" defaultValue={{ from: '2026-10-05', to: '2026-10-09' }} />);
    expect(from()).toHaveValue('05/10/2026');
    expect(to()).toHaveValue('09/10/2026');
    expect(screen.getByRole('group', { name: 'Período' })).toBeInTheDocument();
  });

  it('placeholders: dd/mm/aaaa por padrão, um texto para os dois ou um por campo', () => {
    const { rerender } = render(<DateRangePicker aria-label="Período" />);
    expect(from()).toHaveAttribute('placeholder', 'dd/mm/aaaa');
    expect(to()).toHaveAttribute('placeholder', 'dd/mm/aaaa');
    rerender(<DateRangePicker aria-label="Período" placeholder="Escolha" />);
    expect(to()).toHaveAttribute('placeholder', 'Escolha');
    rerender(<DateRangePicker aria-label="Período" placeholder={['Início', 'Fim']} />);
    expect(from()).toHaveAttribute('placeholder', 'Início');
    expect(to()).toHaveAttribute('placeholder', 'Fim');
  });

  it('abre ao clicar no campo, com dois meses lado a lado', async () => {
    const user = userEvent.setup();
    render(<DateRangePicker aria-label="Período" today={today} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(from());
    expect(screen.getByRole('dialog', { name: 'Escolher período' })).toBeInTheDocument();
    expect(screen.getAllByRole('grid')).toHaveLength(2);
  });

  it('dois cliques no calendário completam o intervalo e fecham', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(from());
    await user.click(day(/5 de outubro de 2026/));
    expect(from()).toHaveValue('05/10/2026');
    expect(value()).toBe('{}');
    await user.click(day(/9 de outubro de 2026/));
    expect(value()).toBe('{"from":"2026-10-05","to":"2026-10-09"}');
    expect(to()).toHaveValue('09/10/2026');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('depois do primeiro clique, o mouse mostra a prévia do intervalo sem alterar o valor', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(from());
    await user.click(day(/5 de outubro de 2026/));
    await user.hover(day(/8 de outubro de 2026/));
    expect(day(/5 de outubro de 2026/)).toHaveAttribute('data-range-start');
    expect(day(/6 de outubro de 2026/)).toHaveAttribute('data-range-middle');
    expect(day(/8 de outubro de 2026/)).toHaveAttribute('data-range-end');
    expect(to()).toHaveValue('');
    expect(value()).toBe('{}');
    await user.hover(day(/2 de outubro de 2026/));
    expect(day(/2 de outubro de 2026/)).toHaveAttribute('data-range-start');
    expect(day(/5 de outubro de 2026/)).toHaveAttribute('data-range-end');
  });

  it('segundo clique antes do primeiro inverte as pontas', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(from());
    await user.click(day(/9 de outubro de 2026/));
    await user.click(day(/5 de outubro de 2026/));
    expect(value()).toBe('{"from":"2026-10-05","to":"2026-10-09"}');
  });

  it('intervalo incompleto: fechar sem o fim descarta o início', async () => {
    const user = userEvent.setup();
    render(<Controlled initial={{ from: '2026-10-01', to: '2026-10-02' }} />);
    await user.click(from());
    await user.click(day(/9 de outubro de 2026/));
    expect(from()).toHaveValue('09/10/2026');
    expect(to()).toHaveValue('');
    await user.keyboard('{Escape}');
    expect(from()).toHaveValue('01/10/2026');
    expect(to()).toHaveValue('02/10/2026');
    expect(value()).toBe('{"from":"2026-10-01","to":"2026-10-02"}');
  });

  it('digitar com máscara atualiza o valor e o calendário', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.type(from(), '05102026');
    expect(from()).toHaveValue('05/10/2026');
    expect(value()).toBe('{}');
    await user.type(to(), '09112026');
    expect(value()).toBe('{"from":"2026-10-05","to":"2026-11-09"}');
    expect(day(/9 de novembro de 2026/)).toHaveAttribute('data-range-end');
    expect(day(/5 de outubro de 2026/)).toHaveAttribute('data-range-start');
  });

  it('digitação inválida não altera o valor e o texto volta ao sair do campo', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <>
        <DateRangePicker
          aria-label="Período"
          today={today}
          defaultValue={{ from: '2026-10-05', to: '2026-10-09' }}
          onChange={onChange}
        />
        <button type="button">fora</button>
      </>,
    );
    await user.clear(to());
    await user.type(to(), '31022026');
    expect(onChange).not.toHaveBeenCalled();
    expect(to()).toHaveAttribute('aria-invalid', 'true');
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'fora' }));
    expect(to()).toHaveValue('09/10/2026');
    expect(to()).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('fim antes do início não vale', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateRangePicker aria-label="Período" today={today} onChange={onChange} />);
    await user.type(from(), '10102026');
    await user.type(to(), '01102026');
    expect(onChange).not.toHaveBeenCalled();
    expect(to()).toHaveAttribute('aria-invalid', 'true');
  });

  it('apagar um campo e depois o outro limpa o valor', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateRangePicker aria-label="Período" defaultValue={{ from: '2026-10-05', to: '2026-10-09' }} onChange={onChange} />);
    await user.clear(from());
    expect(onChange).not.toHaveBeenCalled();
    await user.clear(to());
    expect(onChange).toHaveBeenCalledExactlyOnceWith({});
  });

  it('o botão de limpar esvazia o período e devolve o foco ao início', async () => {
    const user = userEvent.setup();
    render(<Controlled initial={{ from: '2026-10-05', to: '2026-10-09' }} />);
    await user.click(screen.getByRole('button', { name: 'Limpar período' }));
    expect(value()).toBe('{}');
    expect(from()).toHaveValue('');
    expect(from()).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Limpar período' })).not.toBeInTheDocument();
  });

  it('os atalhos escolhem o período e fecham', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(from());
    await user.click(screen.getByRole('button', { name: 'Mês passado' }));
    expect(value()).toBe('{"from":"2026-09-01","to":"2026-09-30"}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('atalhos configuráveis, e [] esconde a coluna', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <DateRangePicker
        aria-label="Período"
        today={today}
        presets={[{ label: 'Safra 26/27', range: { from: '2026-07-01', to: '2027-06-30' } }]}
      />,
    );
    await user.click(from());
    expect(screen.getByRole('button', { name: 'Safra 26/27' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Este mês' })).not.toBeInTheDocument();
    rerender(<DateRangePicker aria-label="Período" today={today} presets={[]} />);
    expect(screen.queryByRole('button', { name: 'Safra 26/27' })).not.toBeInTheDocument();
  });

  it('datas desabilitadas: nem o calendário, nem a digitação, nem o atalho', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateRangePicker
        aria-label="Período"
        today={today}
        disabledDates={{ before: new Date(2026, 9, 10) }}
        onChange={onChange}
      />,
    );
    await user.click(from());
    expect(day(/5 de outubro de 2026/)).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mês passado' })).toBeDisabled();
    await user.type(from(), '05102026');
    await user.type(to(), '15102026');
    expect(onChange).not.toHaveBeenCalled();
    expect(from()).toHaveAttribute('aria-invalid', 'true');
  });

  it('seta para baixo leva o foco ao calendário; Esc fecha e devolve o foco ao campo', async () => {
    const user = userEvent.setup();
    render(<DateRangePicker aria-label="Período" today={today} defaultValue={{ from: '2026-10-14', to: '2026-10-16' }} />);
    from().focus();
    await user.keyboard('{ArrowDown}');
    expect(day(/14 de outubro de 2026/)).toHaveFocus();
    await user.keyboard('{ArrowRight}{Enter}');
    expect(from()).toHaveValue('15/10/2026');
    await user.keyboard('{ArrowDown}{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(from()).toHaveFocus();
  });

  it('Tab para fora fecha o calendário e avisa o onBlur', async () => {
    const user = userEvent.setup();
    const onBlur = vi.fn();
    render(
      <>
        <DateRangePicker aria-label="Período" today={today} onBlur={onBlur} />
        <button type="button">fora</button>
      </>,
    );
    await user.click(from());
    await user.tab();
    expect(to()).toHaveFocus();
    expect(onBlur).not.toHaveBeenCalled();
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: 'fora' })).toHaveFocus();
    expect(onBlur).toHaveBeenCalledOnce();
  });

  it('desabilitado: não abre nem se digita', async () => {
    const user = userEvent.setup();
    render(<DateRangePicker aria-label="Período" disabled defaultValue={{ from: '2026-10-05', to: '2026-10-09' }} />);
    await user.click(screen.getByRole('group'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(from()).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Limpar período' })).not.toBeInTheDocument();
  });

  it('o Field nomeia o grupo, descreve e marca os dois campos como inválidos', () => {
    render(
      <Field label="Período da visita" error="Informe o período.">
        <DateRangePicker />
      </Field>,
    );
    expect(screen.getByRole('group', { name: 'Período da visita' })).toBeInTheDocument();
    for (const input of [from(), to()]) {
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAccessibleDescription('Informe o período.');
    }
    expect(screen.getByText('Período da visita')).toHaveAttribute('for', from().id);
  });

  it('segue o valor controlado quando o formulário o troca', async () => {
    const { rerender } = render(<DateRangePicker aria-label="Período" value={{ from: '2026-10-05', to: '2026-10-09' }} />);
    rerender(<DateRangePicker aria-label="Período" value={{}} />);
    expect(from()).toHaveValue('');
    expect(within(screen.getByRole('group')).getByRole('textbox', { name: 'Data final' })).toHaveValue('');
  });

  it('funciona num formulário do React Hook Form: valor, erro e tocado', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    function Form() {
      const { control, handleSubmit } = useForm<{ period: DateRangeValue }>({ defaultValues: { period: {} } });
      return (
        <form onSubmit={handleSubmit(onSubmit)}>
          <Controller
            name="period"
            control={control}
            rules={{ validate: (period) => (period.from && period.to ? true : 'Informe o período.') }}
            render={({ field, fieldState }) => (
              <Field label="Período" error={fieldState.error?.message}>
                <DateRangePicker today={today} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
              </Field>
            )}
          />
          <button type="submit">Salvar</button>
        </form>
      );
    }
    render(<Form />);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByText('Informe o período.')).toBeInTheDocument();
    expect(from()).toHaveAttribute('aria-invalid', 'true');

    await user.click(from());
    await user.click(screen.getByRole('button', { name: 'Este mês' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit.mock.calls[0]![0]).toEqual({ period: { from: '2026-10-01', to: '2026-10-31' } });
  });
});
