// Registered business details, shown in the footer and on the Terms / Privacy pages.
export const BUSINESS = {
  legalName: "Suyafactory Foods Limited",
  /** CAC company registration number (Nigeria, incorporated 23 April 2025). */
  rcNumber: "RC 8429080",
  /** Public address (city only, by choice). */
  publicAddress: "Lagos, Nigeria",
  /** Factory pin. Kept private: for forms such as Google Play or Paystack, not shown on the site. */
  factoryPin: { lat: 6.6639885902404785, lng: 3.299861192703247 },
  /** Food registration number shown on product pages, per country (only Ghana for now). */
  foodRegNo: { GH: "NAFDAC Reg. No. A-8119868L" } as Partial<Record<string, string>>,
};
