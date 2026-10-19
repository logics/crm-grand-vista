import {
  ArrowDown,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Bell,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  Clock,
  Columns3,
  Download,
  Droplets,
  Ellipsis,
  EllipsisVertical,
  File,
  FileArchive,
  FileExclamationPoint,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideoCamera,
  GripVertical,
  Inbox,
  Kanban,
  LogOut,
  LayoutDashboard,
  LoaderCircle,
  type LucideIcon,
  type LucideProps,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Minus,
  Pencil,
  Plus,
  RefreshCw,
  Ruler,
  Search,
  SearchX,
  Send,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Tractor,
  Trash2,
  TriangleAlert,
  TrendingUp,
  Upload,
  UserRoundCog,
  Users,
  Video,
  Wheat,
  X,
} from 'lucide-react';
import { cn } from '../lib/cn.js';

// Glifo monocromático do Lucide em `currentColor`, o único primitivo de ícone
// do sistema (`Icon.jsx` do export). O export buscava o SVG numa CDN pelo nome;
// aqui o glifo vem do `lucide-react`, empacotado, e só os nomes registrados
// abaixo existem — o nome é verificado pelo TypeScript e glifo fora do registro
// não chega ao bundle. Trocar a fonte dos glifos é editar só este arquivo.

/** Glifos disponíveis, pelo nome kebab-case do Lucide. Glifo novo entra aqui. */
const glyphs = {
  'alert-circle': CircleAlert,
  'alert-triangle': TriangleAlert,
  'arrow-down': ArrowDown,
  'arrow-down-right': ArrowDownRight,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-up': ArrowUp,
  'arrow-up-right': ArrowUpRight,
  bell: Bell,
  'calendar-clock': CalendarClock,
  check: Check,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  clock: Clock,
  'columns-3': Columns3,
  download: Download,
  droplets: Droplets,
  file: File,
  'file-archive': FileArchive,
  'file-image': FileImage,
  'file-spreadsheet': FileSpreadsheet,
  'file-text': FileText,
  'file-video': FileVideoCamera,
  'file-warning': FileExclamationPoint,
  'grip-vertical': GripVertical,
  inbox: Inbox,
  kanban: Kanban,
  'log-out': LogOut,
  'layout-dashboard': LayoutDashboard,
  loader: LoaderCircle,
  mail: Mail,
  'map-pin': MapPin,
  menu: Menu,
  'message-circle': MessageCircle,
  minus: Minus,
  'more-horizontal': Ellipsis,
  'more-vertical': EllipsisVertical,
  pencil: Pencil,
  plus: Plus,
  'refresh-cw': RefreshCw,
  ruler: Ruler,
  search: Search,
  'search-x': SearchX,
  send: Send,
  'share-2': Share2,
  'shield-check': ShieldCheck,
  'sliders-horizontal': SlidersHorizontal,
  tractor: Tractor,
  'trash-2': Trash2,
  'trending-up': TrendingUp,
  upload: Upload,
  'user-round-cog': UserRoundCog,
  users: Users,
  video: Video,
  wheat: Wheat,
  x: X,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof glyphs;

/** Nomes do registro, na ordem em que aparecem; a vitrine do Storybook os lista. */
export const iconNames = Object.keys(glyphs) as IconName[];

/** Traço da marca. Não se misturam espessuras numa mesma tela. */
const iconStroke = 1.5;

/**
 * Lado do quadrado, da escala de espaçamento: xs 12 · sm 14 · md 16 · lg 18 ·
 * xl 20 · 2xl 24. 14 e 18 não estão na escala e saem da soma de dois tokens.
 */
const iconSize = {
  xs: 'size-5',
  sm: 'size-[calc(var(--space-5)+var(--space-1))]',
  md: 'size-6',
  lg: 'size-[calc(var(--space-6)+var(--space-1))]',
  xl: 'size-7',
  '2xl': 'size-8',
} as const;

export type IconSize = keyof typeof iconSize;

export type IconProps = Omit<LucideProps, 'ref' | 'size' | 'color' | 'absoluteStrokeWidth'> & {
  /** Nome do glifo, em kebab-case: `map-pin`, `tractor`, `droplets`. */
  name: IconName;
  /** sm em linha de texto, lg por padrão, xl em botões grandes, 2xl em cabeçalhos. */
  size?: IconSize;
  /** Rótulo acessível. Sem ele, o glifo é decorativo e fica oculto do leitor de tela. */
  title?: string;
};

/** Glifo Lucide no traço da marca (1,5). A cor é a do texto: muda por classe (`text-status-info-fg`). */
export function Icon({ name, size = 'lg', strokeWidth = iconStroke, title, className, ...props }: IconProps) {
  const Glyph = glyphs[name];
  return (
    <Glyph
      data-slot="icon"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      strokeWidth={strokeWidth}
      className={cn('shrink-0', iconSize[size], className)}
      {...props}
    />
  );
}
