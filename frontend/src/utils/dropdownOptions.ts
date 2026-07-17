// Strict dropdown vocabularies derived from the latest PRD (v2).
// Used by ProductTable cascading dropdowns.

export const BODY_PARTS = ['Face', 'Body', 'Hair', 'Lip', 'Eye', 'Others'] as const

export const CATEGORIES = [
  'Wash', 'Moisturizer', 'Serum', 'Toner', 'Mask',
  'Sunscreen', 'Scrub', 'Oil', 'Shampoo', 'Conditioner', 'Spray', 'Balm', 'Others',
] as const

export const SUB_CATEGORIES: Record<string, string[]> = {
  Wash: ['Foaming', 'Gel', 'Creamy', 'Gel with beads', 'Pearly', 'Transparent', 'Gloss'],
  Moisturizer: ['Gel', 'Gel Cream', 'Cream - light', 'Cream - thick', 'Lotion', 'Balm'],
  Serum: ['Water Based', 'Oil Based', 'Bi Phasic'],
  Toner: ['Water', 'Milky'],
  Mask: ['Clay', 'Cream'],
  // PRD 1.4.10 — expanded list for Sunscreen
  Sunscreen: ['Spray', 'Gel', 'Gel Cream', 'Cream - light', 'Cream - thick', 'Lotion', 'Tinted', 'Mineral'],
  Scrub: ['Physical', 'Chemical'],
  Oil: ['Light Weight', 'Normal'],
  Shampoo: ['Pearly', 'Transparent', 'Gel', 'Creamy'],
  Conditioner: ['Lotion', 'Cream - light', 'Cream - thick'],
  Spray: ['Mist', 'Deodorant'],
  Balm: [],
}

export const KEY_BENEFITS: Record<string, string[]> = {
  Face: ['Acne', 'Pigmentation', 'Glow', 'Skin Lightening', 'Aging',
         'Wrinkle', 'Hydration', 'Barrier Repair', 'Dark Circle', 'Sun Protection'],
  Body: ['Acne', 'Pigmentation', 'Glow', 'Skin Lightening', 'Aging',
         'Wrinkle', 'Hydration', 'Barrier Repair', 'Sun Protection'],
  Lip:  ['Acne', 'Pigmentation', 'Glow', 'Hydration', 'Sun Protection'],
  Eye:  ['Dark Circle', 'Aging', 'Wrinkle', 'Hydration'],
  Hair: ['Dandruff', 'Thinning', 'Greying', 'Growth', 'Hydration', 'Frizz', 'Bond Repair'],
}

export const SIZES = ['8', '15', '30', '50', '100', '150', '200'] as const
export const PACKAGING = ['Jar', 'Bottle', 'Tube', 'Stick', 'Chapstick'] as const

/**
 * Number-of-products options.
 * `value` is the integer stored in the DB; `label` is what the user sees.
 * "10 and more" stores 10 — matches the `10_and_more_` bucket in the Excel upload template.
 */
export const PRODUCT_COUNTS: { label: string; value: string }[] = [
  { label: '1',           value: '1' },
  { label: '2',           value: '2' },
  { label: '3',           value: '3' },
  { label: '4',           value: '4' },
  { label: '5',           value: '5' },
  { label: '6',           value: '6' },
  { label: '7',           value: '7' },
  { label: '8',           value: '8' },
  { label: '9',           value: '9' },
  { label: '10 and more', value: '10' },
]

/** Reverse-lookup: numeric DB value → display label */
export const PRODUCT_COUNT_LABEL: Record<number, string> =
  Object.fromEntries(PRODUCT_COUNTS.map(({ label, value }) => [Number(value), label]))
