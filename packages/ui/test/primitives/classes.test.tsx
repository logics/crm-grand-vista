// @vitest-environment jsdom
import '../support/dom.js';
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
import { describeEveryClassGeneratesCss } from '../support/classes.js';

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

describeEveryClassGeneratesCss('classes dos primitivos', primitives);
