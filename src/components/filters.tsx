import { Chip, GroupHead, LinkButton } from '@/components/chip'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDraft } from '@/hooks/use-draft'
import { useI18n } from '@/i18n'
import type { Dataset, ExplorerSearch } from '@/lib/data'
import { TYPE_COLOR, TYPE_ORDER, matches, shortProvider } from '@/lib/tariffs'
import type { Filters as FilterState } from '@/lib/tariffs'
import type { TariffColor } from '@/lib/types'

interface FiltersProps {
  data: Dataset
  filters: FilterState
  search: ExplorerSearch
  update: (patch: Partial<ExplorerSearch>) => void
  toggleProvider: (p: string) => void
  selectMonth: (ym: number | 'all') => void
}

const fieldLabel = 'text-[13px] font-semibold text-muted-foreground'
const control = 'h-[42px] bg-card text-[15px] shadow-none'

export function Filters({ data, filters, search, update, toggleProvider, selectMonth }: FiltersProps) {
  const { t, ymLabel } = useI18n()
  const [kwhText, setKwhText] = useDraft(search.kwh, String, (s, v) => (Number(s) || 0) === v)

  // Chip counts reflect every other filter
  const provCount = new Map<string, number>()
  const typeCount = new Map<TariffColor, number>()
  for (const tariff of data.tariffs) {
    if (matches(tariff, filters, 'prov')) provCount.set(tariff.p, (provCount.get(tariff.p) ?? 0) + 1)
    if (matches(tariff, filters, 'type')) typeCount.set(tariff.c, (typeCount.get(tariff.c) ?? 0) + 1)
  }

  const toggleType = (c: TariffColor) =>
    update({ type: search.type.includes(c) ? search.type.filter((x) => x !== c) : [...search.type, c] })

  return (
    <section className="grid gap-[22px] pt-7" aria-label="Filters">
      <div className="flex flex-wrap items-end gap-x-7 gap-y-4">
        <div className="grid gap-1.5">
          <Label htmlFor="month" className={fieldLabel}>
            {t.month}
          </Label>
          <Select value={String(filters.ym)} onValueChange={(v) => selectMonth(v === 'all' ? 'all' : Number(v))}>
            <SelectTrigger id="month" className={`${control} min-w-48 data-[size=default]:h-[42px]`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-80">
              {[...data.months].reverse().map((ym) => (
                <SelectItem key={ym} value={String(ym)}>
                  {ymLabel(ym)}
                </SelectItem>
              ))}
              <SelectItem value="all">{t.allMonths}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="kwh" className={fieldLabel}>
            {t.usage}
          </Label>
          <Input
            id="kwh"
            type="number"
            min={0}
            step={10}
            inputMode="numeric"
            className={`${control} w-[110px]`}
            value={kwhText}
            onChange={(e) => {
              setKwhText(e.target.value)
              update({ kwh: Math.max(0, Number(e.target.value) || 0) })
            }}
          />
        </div>
        <CheckField id="avail" checked={search.open} onChange={(open) => update({ open })}>
          {t.onlyOpen}
        </CheckField>
        <CheckField id="disc" checked={search.disc} onChange={(disc) => update({ disc })}>
          {t.applyDiscounts}
        </CheckField>
      </div>

      <div>
        <GroupHead id="prov-label" label={t.providers}>
          {search.prov.length ? (
            <LinkButton onClick={() => update({ prov: [] })}>{t.showAllProviders}</LinkButton>
          ) : (
            <span className="text-[13px] text-muted-foreground">{t.providersHint}</span>
          )}
        </GroupHead>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="prov-label">
          {data.providers.map((p) => (
            <Chip
              key={p}
              pressed={search.prov.includes(p)}
              onPressedChange={() => toggleProvider(p)}
              count={provCount.get(p) ?? 0}
            >
              {shortProvider(p)}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <GroupHead id="type-label" label={t.tariffType}>
          {search.type.length > 0 && <LinkButton onClick={() => update({ type: [] })}>{t.showAllTypes}</LinkButton>}
        </GroupHead>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="type-label">
          {TYPE_ORDER.map((c) => (
            <Chip
              key={c}
              pressed={search.type.includes(c)}
              onPressedChange={() => toggleType(c)}
              count={typeCount.get(c) ?? 0}
              dot={TYPE_COLOR[c]}
            >
              {t.typeLabel[c]}
            </Chip>
          ))}
        </div>
      </div>
    </section>
  )
}

function CheckField({
  id,
  checked,
  onChange,
  children,
}: {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-[42px] items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} className="size-[18px]" />
      <Label htmlFor={id} className="cursor-pointer text-[15px] font-normal">
        {children}
      </Label>
    </div>
  )
}
