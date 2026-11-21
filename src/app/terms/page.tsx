import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { BUSINESS, FOOD_INFO } from "@/lib/business";

export const metadata = {
  title: "Terms · Suya Factory",
  description: "The terms for buying Suya Factory kilishi in Nigeria and Ghana, including cancellations and refunds.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of sale"
      intro={
        <p>
          These terms apply when you buy Suya Factory kilishi. &quot;We&quot; means {BUSINESS.legalName} ({BUSINESS.rcNumber}).
          By placing an order you agree to them. The short version: in Ghana you pay us by MoMo and book your own rider;
          in Nigeria you buy from a supermarket. You can cancel a Ghana order for a full refund until we hand it to your rider.
        </p>
      }
    >
      <section>
        <h2>1. Our product</h2>
        <p>
          Beef kilishi, packed in sealed packs. Ingredients: {FOOD_INFO.ingredients}.{" "}
          <strong>Allergen: contains {FOOD_INFO.allergens.toLowerCase()}.</strong> Do not eat it if you are allergic to groundnuts.
          {FOOD_INFO.halal ? " The beef is halal." : ""} Best before {FOOD_INFO.shelfLife} from packing. {FOOD_INFO.storage}
        </p>
        <p>Photos are for illustration; each batch is handmade, so pieces can look slightly different.</p>
      </section>

      <section>
        <h2>2. Nigeria: buying from supermarkets</h2>
        <ul>
          <li>In Nigeria we sell through partner supermarkets. You pay the supermarket, at its prices and on its terms.</li>
          <li>If you send a rider (Bolt, inDrive or another app), you book and pay the rider yourself. We need the rider&apos;s
            name and phone so the supermarket knows who to hand your kilishi to.</li>
          <li>Returns and refunds for what you bought follow the supermarket&apos;s own rules.</li>
          <li>Quality problem with the kilishi itself? Send us a photo on WhatsApp within 24 hours and we&apos;ll look into it.</li>
        </ul>
      </section>

      <section>
        <h2>3. Ghana: ordering online</h2>
        <ul>
          <li>Prices are shown in cedis (GH₵) and are the prices on the website when you order.</li>
          <li>You pay for the kilishi by Mobile Money to the number shown on your order page, then tap &quot;I&apos;ve paid&quot;
            and tell us the MoMo number you paid from. Your order is confirmed once we see the money arrive.</li>
          <li>After we confirm your payment, you book your own rider (for example Bolt, Uber, Yango or Qargo) to collect from our
            pickup point, and you pay the rider yourself. The delivery app&apos;s own terms apply to that ride.</li>
          <li>Your order page gives you a 4-digit pickup code. We hand your order only to a rider who says the right code, so keep
            it to yourself and your rider.</li>
          <li><strong>Our part ends when we hand your order to your rider.</strong> After that, the delivery is between you and your
            rider or their delivery app.</li>
        </ul>
      </section>

      <section>
        <h2>4. Ghana: cancelling and refunds</h2>
        <ul>
          <li>You can cancel on your order page <strong>at any time until we hand your order to your rider</strong>. You get a full refund.</li>
          <li><strong>Refunds are sent only to the MoMo number the payment came from</strong>, as shown on our MoMo statement. We never
            refund to a different number, even if asked. This protects you and us from fraud.</li>
          <li>We send refunds within 2 days of you cancelling.</li>
          <li>Once your order has been handed to your rider, it can no longer be cancelled.</li>
          <li>If we can&apos;t find your payment, nothing is refunded until it arrives. Please check the number and amount you sent.</li>
        </ul>
      </section>

      <section>
        <h2>5. Wrong or damaged packs</h2>
        <p>
          If a pack is wrong, open or damaged when you receive it, send us a photo within 24 hours (WhatsApp or email) with your
          order number. We will replace it. We can&apos;t accept complaints about packs that were opened and partly eaten, stored
          badly, or kept past their best-before date.
        </p>
      </section>

      <section>
        <h2>6. Bulk orders</h2>
        <p>
          Orders of 1kg or more are agreed with us directly on the <Link href="/bulk-orders" className="text-orange-700 underline">bulk orders</Link> page
          (WhatsApp, phone or enquiry form). The price, payment and delivery we agree in writing apply to that order.
        </p>
      </section>

      <section>
        <h2>7. Your account</h2>
        <p>
          You can order with or without an account. Keep your password and your order links private: anyone with an order&apos;s
          link can see it. You must give a correct name and phone number so we and your rider can reach you.
        </p>
      </section>

      <section>
        <h2>8. Our responsibility</h2>
        <p>
          We make and pack our kilishi with care and follow food safety rules. We are not responsible for delays or problems
          caused by riders or delivery apps you book, by supermarkets&apos; own service, or by events outside our control. Nothing in
          these terms takes away rights you have under consumer protection law in Nigeria or Ghana.
        </p>
      </section>

      <section>
        <h2>9. Changes</h2>
        <p>We may update these terms. The version on this page when you order is the one that applies to your order.</p>
      </section>
    </LegalPage>
  );
}
