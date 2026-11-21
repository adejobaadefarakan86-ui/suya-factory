import { LegalPage } from "@/components/legal-page";
import { BUSINESS } from "@/lib/business";

export const metadata = {
  title: "Privacy · Suya Factory",
  description: "What personal information Suya Factory collects, why, who we share it with, and your rights.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      intro={
        <p>
          {BUSINESS.legalName} ({BUSINESS.rcNumber}) runs this website and app. We only collect what we need to sell you kilishi
          and get it to you. We don&apos;t sell your information. We follow the Nigeria Data Protection Act 2023 and Ghana&apos;s
          Data Protection Act, 2012 (Act 843).
        </p>
      }
    >
      <section>
        <h2>1. What we collect</h2>
        <ul>
          <li><strong>Contact details:</strong> your name, phone number and email.</li>
          <li><strong>Delivery details:</strong> your address, landmark and the map pin you choose.</li>
          <li><strong>Payment details (Ghana):</strong> the amount, the MoMo number you paid from and any reference you give.
            We never see your MoMo PIN.</li>
          <li><strong>Your rider&apos;s details:</strong> the name, phone, plate number and delivery app of the rider you book.</li>
          <li><strong>Order details:</strong> what you ordered, when, and if you cancel, the reason you give.</li>
          <li><strong>Bulk enquiries:</strong> what you write in the enquiry form.</li>
          <li><strong>Account:</strong> if you create one, your email and a securely stored password.</li>
        </ul>
      </section>

      <section>
        <h2>2. Why we use it</h2>
        <ul>
          <li>To take and confirm your order, check your payment and send refunds to the number that paid.</li>
          <li>To hand your order to the right rider (that&apos;s why we ask for your rider&apos;s details and give you a pickup code).</li>
          <li>To contact you about your order or enquiry by phone, WhatsApp or email.</li>
          <li>To keep the records the law requires and to prevent fraud.</li>
        </ul>
        <p>We don&apos;t send marketing messages unless you ask us to.</p>
      </section>

      <section>
        <h2>3. Who we share it with</h2>
        <ul>
          <li><strong>Our staff</strong> who handle your order, including through our private Telegram staff group.</li>
          <li><strong>Supermarkets (Nigeria):</strong> your name and your rider&apos;s details, so they hand over to the right person.</li>
          <li><strong>Service providers</strong> that run the website for us: Supabase (database and accounts) and Vercel (hosting).
            Maps and address search use OpenFreeMap and Photon (Komoot), which receive what you search for and the map area
            you view, not your name.</li>
          <li><strong>Authorities</strong>, only when the law requires it.</li>
        </ul>
        <p>
          When you book a rider, you copy details into the delivery app yourself (for example Bolt or Uber); that app&apos;s
          own privacy policy applies to what you give it.
        </p>
      </section>

      <section>
        <h2>4. Cookies and storage on your device</h2>
        <p>
          We use only what the site needs to work: a cookie to remember your country (Nigeria or Ghana), a cookie to keep you
          signed in, and storage in your browser for your cart and saved details. No advertising or tracking cookies.
        </p>
      </section>

      <section>
        <h2>5. How long we keep it</h2>
        <p>
          We keep order and payment records for as long as tax and accounting laws require, and other information only as long
          as we need it. You can ask us to delete your account at any time.
        </p>
      </section>

      <section>
        <h2>6. Your rights</h2>
        <p>
          You can ask to see the information we hold about you, correct it, delete it, or object to how we use it. Email{" "}
          <a href={`mailto:${BUSINESS.email}`} className="text-orange-700 underline">{BUSINESS.email}</a> and we&apos;ll reply
          within 30 days. You can also complain to the Nigeria Data Protection Commission or Ghana&apos;s Data Protection Commission.
        </p>
      </section>

      <section>
        <h2>7. Keeping it safe</h2>
        <p>
          Your information is stored securely, only staff can see orders, and each order page is protected by a private link.
          Please don&apos;t share your order link or pickup code with anyone except your rider.
        </p>
      </section>

      <section>
        <h2>8. Children</h2>
        <p>This site is not meant for children under 13, and we don&apos;t knowingly collect their information.</p>
      </section>

      <section>
        <h2>9. Changes</h2>
        <p>If we change this policy, we&apos;ll update the date at the top of this page.</p>
      </section>
    </LegalPage>
  );
}
