// Strict dropdown vocabularies derived from the latest PRD (v2).
// Used by ProductTable cascading dropdowns.

export const BODY_PARTS = ['Face', 'Body', 'Hair', 'Lip', 'Eye'] as const

export const CATEGORIES = [
  'Wash', 'Moisturizer', 'Serum', 'Toner', 'Mask',
  'Sunscreen', 'Scrub', 'Oil', 'Shampoo', 'Conditioner', 'Spray',
] as const

export const SUB_CATEGORIES: Record<string, string[]> = {
  Wash: ['Foaming', 'Gel', 'Creamy', 'Gel with beads', 'Pearly', 'Transparent', 'Gloss'],
  Moisturizer: ['Gel', 'Gel Cream', 'Cream - light', 'Cream - thick', 'Lotion', 'Balm'],
  Serum: ['Water Based', 'Oil Based'],
  Toner: ['Water', 'Milky'],
  Mask: ['Clay', 'Cream'],
  // PRD 1.4.10 — expanded list for Sunscreen
  Sunscreen: ['Spray', 'Gel', 'Gel Cream', 'Cream - light', 'Cream - thick', 'Lotion'],
  Scrub: ['Physical', 'Chemical'],
  Oil: ['Light Weight', 'Normal'],
  Shampoo: ['Pearly', 'Transparent', 'Gel', 'Creamy'],
  Conditioner: ['Lotion', 'Cream - light', 'Cream - thick'],
  Spray: ['Mist', 'Deodorant'],
}

export const KEY_BENEFITS: Record<string, string[]> = {
  Face: ['Acne', 'Pigmentation', 'Glow', 'Skin Lightening', 'Aging',
         'Wrinkle', 'Hydration', 'Barrier Repair', 'Dark Circle'],
  Body: ['Acne', 'Pigmentation', 'Glow', 'Skin Lightening', 'Aging',
         'Wrinkle', 'Hydration', 'Barrier Repair'],
  Lip:  ['Acne', 'Pigmentation', 'Glow', 'Hydration'],
  Eye:  ['Dark Circle', 'Aging', 'Wrinkle', 'Hydration'],
  Hair: ['Dandruff', 'Thinning', 'Greying', 'Growth', 'Hydration', 'Frizz', 'Bond Repair'],
}

export const SIZES = ['8', '15', '30', '50', '100', '150', '200'] as const
export const PACKAGING = ['Jar', 'Bottle', 'Tube'] as const
export const PRODUCT_COUNTS = Array.from({ length: 20 }, (_, i) => String(i + 1))
