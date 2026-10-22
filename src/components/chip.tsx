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
        'group/chip h-auto min-w-0 rounded-full bg-card px-3 py-1.5 font-normal text-foreground shadow-none',
        'hover:border-muted-foreground hover:bg-card hover:text-foreground',
        variant === 'solid'
          ? 'data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground'
          : 'data-[state=on]:border-primary data-[state=on]:bg-secondary data-[state=on]:font-[650] data-[state=on]:text-foreground',
        count === 0 && 'opacity-45',
        className,
      )}
    >
      {dot && (
        <span
          className="size-3 flex-none rounded-full group-data-[state=on]/chip:shadow-[0_0_0_2px_#fff]"
          style={{ background: dot }}
          aria-hidden
        />
      )}
      {children}
      {count != null && (
        <span className="text-xs text-muted-foreground group-data-[state=on]/chip:text-[#aab6c2]">{count}</span>
      )}
    </Toggle>
  )
}

export function GroupHead({ id, label, children }: { id: string; label: string; children?: React.ReactNode }) {
  return (
    <div className="mb-2 flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
      <span id={id} className="text-[13px] font-semibold text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  )
}

export function LinkButton(props: React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      {...props}
      className={cn('cursor-pointer text-[13px] text-link underline', props.className)}
    />
  )
}
