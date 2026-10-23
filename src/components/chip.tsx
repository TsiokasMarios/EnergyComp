import { Toggle } from '@/components/ui/toggle'
import { cn } from '@/lib/utils'

interface ChipProps {
  pressed: boolean
  onPressedChange: () => void
  children: React.ReactNode
  /** Count shown after the label; chips with 0 are dimmed */
  count?: number
  /** Swatch colour before the label */
  dot?: string
  variant?: 'solid' | 'soft'
  className?: string
}

export function Chip({ pressed, onPressedChange, children, count, dot, variant = 'solid', className }: ChipProps) {
  return (
    <Toggle
      variant="outline"
      pressed={pressed}
      onPressedChange={onPressedChange}
      className={cn(
        'group/chip h-8 min-w-0 gap-1.5 rounded-full bg-card px-3 text-sm font-medium text-foreground shadow-none',
        'hover:border-muted-foreground hover:bg-card hover:text-foreground',
        variant === 'solid'
          ? 'data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground'
          : 'data-[state=on]:border-primary data-[state=on]:bg-secondary data-[state=on]:text-foreground data-[state=on]:shadow-[inset_0_0_0_1px_var(--primary)]',
        count === 0 && 'opacity-45',
        className,
      )}
    >
      {dot && (
        <span
          className="size-2.5 flex-none rounded-full group-data-[state=on]/chip:shadow-[0_0_0_2px_#fff]"
          style={{ background: dot }}
          aria-hidden
        />
      )}
      {children}
      {count != null && (
        <span className="text-xs font-normal text-muted-foreground group-data-[state=on]/chip:text-[#aab6c2]">
          {count}
        </span>
      )}
    </Toggle>
  )
}

export function GroupHead({ id, label, children }: { id: string; label: string; children?: React.ReactNode }) {
  return (
    <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[13px] leading-5">
      <span id={id} className="font-semibold text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  )
}

export function LinkButton(props: React.ComponentProps<'button'>) {
  return <button type="button" {...props} className={cn('link text-[13px] font-medium', props.className)} />
}
