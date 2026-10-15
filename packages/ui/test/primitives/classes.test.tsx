// @vitest-environment jsdom
import '../support/dom.js';
import { render } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  Calendar,
  Checkbox,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogEyebrow,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  Switch,
  Tabs,
  TabsContent,
  TabsCount,
  TabsList,
  TabsTrigger,
} from '../../src/index.js';
import { compileStyles, hasRule } from '../support/tailwind.js';

// O tema padrão do Tailwind não é importado: classe fora dos tokens (`p-14`,
// `text-2xl`, `bg-red-500`) não gera CSS e falha em silêncio, com o componente
// sem estilo. Aqui cada primitivo é renderizado aberto, em cada variante, e
// toda classe que aparece no DOM tem de gerar regra na folha compilada.

/** Classes que não são utilitários: marcadores de grupo, classes de base dos tokens, as que o react-day-picker e o Lucide põem sozinhos. */
const notUtility = /^(?:group(?:\/[\w-]+)?|peer|gv-[\w-]+|rdp-[\w-]+|lucide(?:-[\w-]+)?)$/;

function classesInDocument(): string[] {
  const classes = new Set<string>();
  for (const element of document.querySelectorAll('[class]')) {
    for (const className of element.classList) if (!notUtility.test(className)) classes.add(className);
  }
  return [...classes].sort();
}

const october2026 = new Date(2026, 9, 1);

const primitives = {
  Dialog: () => (
    <Dialog open>
      <DialogContent>
        <DialogHeader>
          <DialogEyebrow>Oportunidade</DialogEyebrow>
          <DialogTitle>Enviar ao comprador</DialogTitle>
          <DialogDescription>Descrição</DialogDescription>
        </DialogHeader>
        <DialogBody>Corpo</DialogBody>
        <DialogFooter>Ações</DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  'Dialog sheet': () => (
    <Dialog open>
      <DialogContent variant="sheet">
        <DialogHeader>
          <DialogTitle>Filtros</DialogTitle>
        </DialogHeader>
        <DialogBody>Corpo</DialogBody>
        <DialogFooter>Ações</DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  Select: () => (
    <Select open value="mg">
      <SelectTrigger size="lg" aria-invalid>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Estado</SelectLabel>
          <SelectItem value="mg">Minas Gerais</SelectItem>
          <SelectSeparator />
          <SelectItem value="ba" disabled>
            Bahia
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
  'Select pequeno': () => (
    <Select>
      <SelectTrigger size="sm">
        <SelectValue placeholder="Todas" />
      </SelectTrigger>
    </Select>
  ),
  Tabs: () => (
    <Tabs defaultValue="ficha">
      <TabsList>
        <TabsTrigger value="ficha">Ficha técnica</TabsTrigger>
        <TabsTrigger value="docs">
          Documentos <TabsCount>14</TabsCount>
        </TabsTrigger>
      </TabsList>
      <TabsList variant="underline" size="sm">
        <TabsTrigger value="ficha">Ficha técnica</TabsTrigger>
        <TabsTrigger value="hist" disabled>
          Histórico
        </TabsTrigger>
      </TabsList>
      <TabsContent value="ficha">Painel</TabsContent>
    </Tabs>
  ),
  Switch: () => (
    <>
      <Switch defaultChecked />
      <Switch disabled />
    </>
  ),
  Checkbox: () => (
    <>
      <Checkbox defaultChecked />
      <Checkbox checked="indeterminate" />
      <Checkbox disabled aria-invalid />
    </>
  ),
  Popover: () => (
    <Popover open>
      <PopoverTrigger>Abrir</PopoverTrigger>
      <PopoverContent>Conteúdo</PopoverContent>
    </Popover>
  ),
  Command: () => (
    <Command>
      <CommandInput placeholder="Buscar fazenda" />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>
        <CommandGroup heading="Fazendas">
          <CommandItem>
            Santa Helena <CommandShortcut>⌘K</CommandShortcut>
          </CommandItem>
          <CommandItem disabled>Boa Vista</CommandItem>
        </CommandGroup>
        <CommandSeparator />
      </CommandList>
    </Command>
  ),
  'Calendar intervalo': () => (
    <Calendar
      mode="range"
      defaultMonth={october2026}
      selected={{ from: new Date(2026, 9, 5), to: new Date(2026, 9, 9) }}
      disabled={{ before: new Date(2026, 9, 3) }}
      today={new Date(2026, 9, 15)}
      numberOfMonths={2}
    />
  ),
  'Calendar único': () => <Calendar mode="single" defaultMonth={october2026} selected={new Date(2026, 9, 20)} />,
};

let build: (candidates: string[]) => string;

beforeAll(async () => {
  build = await compileStyles();
});

describe('classes dos primitivos', () => {
  it.each(Object.entries(primitives))('%s: toda classe gera CSS com o tema dos tokens', (_, Primitive) => {
    render(<Primitive />);
    const classes = classesInDocument();
    expect(classes.length).toBeGreaterThan(0);
    const css = build(classes);
    const missing = classes.filter((className) => !hasRule(css, className));
    expect(missing).toEqual([]);
  });
});
