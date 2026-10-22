const months = (n: number) => `${n} month${n === 1 ? '' : 's'}`

export const en = {
  // Page
  title: 'Household electricity tariffs in Greece',
  description:
    'Compare every residential electricity tariff registered with the Greek energy regulator (RAAEY), month by month, at your own usage.',
  lede: 'Every residential tariff registered with the energy regulator (RAAEY), month by month. Pick your providers, set your monthly usage and compare.',
  sourcePrefix: 'Data from',
  sourceSuffix: (date: string) =>
    `, captured ${date}. Prices are the supply charge only, before network charges, levies and VAT.`,
  otherLanguage: 'Ελληνικά',
  footer: [
    "Estimated cost = fixed fee + your kWh at the tariff's price, following its kWh tiers. It covers the supplier's charge only; your bill also includes regulated network charges, ETMEAR, levies and VAT, which are the same whichever supplier you pick.",
    'Variable (yellow) tariffs publish their price at the start of each month, so the newest month may show "Not published yet". Conditional discounts usually require on-time payment or e-billing; open a tariff\'s details to see the exact condition.',
  ],
  loadError: "Couldn't load the tariff data.",
  retry: 'Try again',

  // Filters
  month: 'Month',
  allMonths: 'All months (history)',
  usage: 'Your monthly usage (kWh)',
  onlyOpen: 'Only tariffs open to new customers',
  applyDiscounts: 'Apply conditional discounts',
  providers: 'Providers',
  providersHint: 'Showing all. Tap to pick one or more.',
  showAllProviders: 'Show all providers',
  tariffType: 'Tariff type',
  showAllTypes: 'Show all types',
  typeLabel: { blue: 'Fixed price', yellow: 'Variable', green: 'Green tariff' },
  typeShort: { blue: 'Fixed', yellow: 'Variable', green: 'Green' },

  // Trend
  trendTitle: 'Cheapest plan each month',
  trendNote: (kwh: number) =>
    `One line per plan type: the best fixed, variable and green tariff each month. Prices are all-in at your usage of ${kwh} kWh a month (fixed fee plus every kWh), so tariffs with a high fee or a free allowance compare fairly.`,
  compareBy: 'Compare by',
  perKwh: '€ per kWh',
  perMonth: '€ per month',
  compareProviders: 'Compare providers',
  compareHint: (n: number) =>
    n === 0
      ? 'Pick providers to see each one in its own chart.'
      : n === 1
        ? 'Pick another provider to compare side by side.'
        : `Comparing ${n} providers side by side. The list below is filtered to them too.`,
  legendCheapest: 'Cheapest plan that month',
  legendHint: 'Hover for details; click a month to list its tariffs',
  chartEmpty: 'No tariffs with a published price match these filters.',
  chartNoUsage: 'Enter your monthly usage above to compare tariffs.',
  allProviders: 'All providers',
  chartAria: (title: string, metric: 'price' | 'est', kwh: number, from: string, to: string) =>
    `${title}: best ${metric === 'price' ? 'all-in price per kWh' : 'estimated monthly bill'} at ${kwh} kWh for each plan type, ${from} to ${to}. The table below lists every value.`,
  panelWins: (k: number, n: number) => `cheapest of your picks in ${k} of ${n} months`,
  noTariffThisMonth: 'No tariff this month',
  cheapest: 'Cheapest',
  bestOfPicks: 'Best of your picks:',
  clickToList: 'Click to list this month’s tariffs',
  cheapestType: 'Cheapest plan type',
  scopeAt: (p: string) => ` at ${p}`,
  scopePicks: ' among your picks',
  cheapestProvider: 'Cheapest provider',
  months,
  countedOver: (n: number, from: string, to: string) =>
    `Counted over ${months(n)}, ${from} to ${to}, with your filters and usage.`,
  cheapTitle: (metric: 'price' | 'est', kwh: number) =>
    `Best price for each plan type, month by month (${metric === 'price' ? `all-in € per kWh at ${kwh} kWh` : `estimated € per month at ${kwh} kWh`})`,

  // Results
  count: (n: string, nNum: number, p: number) =>
    `${n} tariff${nNum === 1 ? '' : 's'} from ${p} provider${p === 1 ? '' : 's'}`,
  allMonthsSince: (from: string) => `All months since ${from}`,
  lowest: (provider: string, name: string, price: string, kwh: number) =>
    `Lowest estimate: ${provider}, ${name}, ${price} per month at ${kwh} kWh`,
  search: 'Search tariff names',
  searchPlaceholder: 'e.g. Home, Blue, Smart',
  colProvider: 'Provider',
  colTariff: 'Tariff',
  colType: 'Type',
  colPrice: 'Price €/kWh',
  colFee: 'Fixed fee €/month',
  colEst: (kwh: number) => `Est. €/month at ${kwh} kWh`,
  colContract: 'Contract',
  notOpen: 'Not open to new customers',
  open: 'Open to new customers',
  notPublished: 'Not published yet',
  cantEstimate: "Can't estimate",
  tierWhole: (kwh: number, price: string) => `above ${kwh} kWh: ${price} on all kWh`,
  tierFrom: (kwh: number, price: string) => `from ${kwh} kWh: ${price}`,
  na: 'n/a',
  night: (price: string) => `night ${price}`,
  details: 'Details',
  hide: 'Hide',
  noMatches: 'No tariffs match these filters.',
  reset: 'Reset filters',
  showMore: (n: number) => `Show ${n} more`,
  showing: (shown: string, total: string) => `Showing ${shown} of ${total}`,
  durMonths: (d: string) => `${d} months`,
  openEnded: 'Open-ended',

  // Details
  priceByUsage: 'Price by usage',
  usageCol: 'Usage',
  perKwhCol: '€/kWh',
  withDiscount: 'With discount',
  feeCol: 'Fee €/month',
  wholeNote: 'Once usage passes the threshold, the higher price applies to every kWh.',
  price: 'Price',
  fixedFee: 'Fixed fee',
  both: (std: string, disc: string) => `${std} standard, ${disc} with discount`,
  perKwhSuffix: 'per kWh',
  perMonthSuffix: 'per month',
  nightZone: 'Night / reduced-rate zone',
  priceCond: 'Condition for price discount',
  feeCond: 'Condition for fee discount',
  notes: 'Notes',
  listing: 'Listing',
  invoice: (id: number) => `invoice #${id}`,
}

export type Dict = typeof en
