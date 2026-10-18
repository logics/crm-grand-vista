import { cn } from '@crm/ui';
import { Link, type LinkProps } from 'react-router';

/** Link de navegação em texto, na cor da marca. */
export function TextLink({ className, ...props }: LinkProps) {
  return (
    <Link
      className={cn(
        'rounded-control text-sm font-medium text-brand-primary underline-offset-4 outline-none hover:underline focus-visible:shadow-ring-focus',
        className,
      )}
      {...props}
    />
  );
}
