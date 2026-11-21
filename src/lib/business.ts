// Registered business details, shown in the footer and on the Terms / Privacy pages.
export const BUSINESS = {
  legalName: "Suyafactory Foods Limited",
  /** CAC company registration number (Nigeria, incorporated 23 April 2025). */
  rcNumber: "RC 8429080",
  /** Public address (city only, by choice). */
  publicAddress: "Lagos, Nigeria",
  /** Customer contact email (Contact, Terms, Privacy, footer). */
  email: "suyafactoryfoodslimited@gmail.com",
  /** Factory pin. Kept private: for forms such as Google Play or Paystack, not shown on the site. */
  factoryPin: { lat: 6.6639885902404785, lng: 3.299861192703247 },
  /** Food registration number shown on product pages, per country (only Ghana for now). */
  foodRegNo: { GH: "NAFDAC Reg. No. A-8119868L" } as Partial<Record<string, string>>,
};

/** Social pages per country (tracking bits removed from the links). TikTok is shared. */
export const SOCIAL: Record<"NG" | "GH", { name: string; url: string }[]> = {
  NG: [
    { name: "Instagram", url: "https://www.instagram.com/suyafactorynaija" },
    { name: "TikTok", url: "https://www.tiktok.com/@suyafactory" },
    { name: "Facebook", url: "https://www.facebook.com/share/1EB61dQQ1M/" },
  ],
  GH: [
    { name: "Instagram", url: "https://www.instagram.com/suyafactorygh" },
    { name: "TikTok", url: "https://www.tiktok.com/@suyafactory" },
    { name: "Facebook", url: "https://www.facebook.com/share/1EB61dQQ1M/" },
  ],
};
