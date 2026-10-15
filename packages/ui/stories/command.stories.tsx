import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '../src/index.js';

// Base do `AsyncCombobox`, que chega com a spec do módulo que o usa.
const meta = {
  title: 'Primitivos/Command',
  component: Command,
  render: (args) => (
    <Command {...args} className="max-w-[calc(9*var(--space-10))] rounded-card shadow-sm">
      <CommandInput placeholder="Buscar fazenda ou comprador" />
      <CommandList>
        <CommandEmpty>Nenhum resultado.</CommandEmpty>
        <CommandGroup heading="Fazendas">
          <CommandItem>
            Fazenda Três Barras <CommandShortcut>MG</CommandShortcut>
          </CommandItem>
          <CommandItem>
            Fazenda Boa Esperança <CommandShortcut>BA</CommandShortcut>
          </CommandItem>
          <CommandItem disabled>Fazenda Santa Helena</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Compradores">
          <CommandItem>Agro Holding Bertoldi</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
} satisfies Meta<typeof Command>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = { name: 'Padrão' };

export const ItemDestacado: Story = { name: 'Item destacado', args: { defaultValue: 'Agro Holding Bertoldi' } };
