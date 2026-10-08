import { Link, NavLink, useParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { StarField } from '../components/Celestial';

/**
 * Company particulars used across all policies. Replace every value marked "TO BE COMPLETED" with the
 * registered details before launch — these are shown to users and required by the Consumer Protection
 * (E-Commerce) Rules, 2020 and the Digital Personal Data Protection Act, 2023.
 */
export const COMPANY = {
  legalName: 'Astro Rahu (legal entity name TO BE COMPLETED)',
  address: 'Registered office address TO BE COMPLETED, Bengaluru, Karnataka, India',
  cin: 'CIN TO BE COMPLETED',
  gstin: 'GSTIN TO BE COMPLETED',
  supportEmail: 'care@AstroRahu.com',
  privacyEmail: 'privacy@AstroRahu.com',
  grievanceOfficer: 'Grievance Officer (name TO BE COMPLETED)',
  grievanceEmail: 'grievance@AstroRahu.com',
  phone: '+91 7698 601 309',
  effective: '28 September 2026',
  version: '2026-09',
};

type Doc = { title: string; sections: [string, string[]][] };

const DOCS: Record<string, Doc> = {
  terms: { title: 'Terms of Service', sections: [
    ['1. About these terms', [`These Terms govern your use of the Astro Rahu website and apps operated by ${COMPANY.legalName} (“Astro Rahu”, “we”). Astro Rahu is a marketplace connecting users with independent astrologers, tarot readers and numerologists (“Astrologers”). By creating an account you agree to these Terms, our Privacy Policy and our Refund & Cancellation Policy.`]],
    ['2. Eligibility', ['You must be at least 18 years old and capable of entering a binding contract under the Indian Contract Act, 1872. You may hold only one customer account.']],
    ['3. Nature of the service', ['Consultations are provided by Astrologers, who are independent service providers and not employees of Astro Rahu. Astrology is a belief-based practice. Guidance is offered for insight and reflection only and is not a substitute for professional medical, psychological, legal, financial or other advice. Do not delay or stop medical treatment, or make major financial or legal decisions, solely on the basis of a consultation.', 'Astro Rahu does not guarantee any outcome, prediction, or result, and no Astrologer is permitted to promise one.']],
    ['4. Accounts and security', ['You are responsible for keeping your login credentials confidential and for all activity under your account. Notify us immediately at ' + COMPANY.supportEmail + ' of any unauthorised use.']],
    ['5. Wallet, pricing and billing', ['Consultations are paid from your Astro Rahu wallet. Prices are shown per minute on each Astrologer’s profile and include applicable taxes unless stated otherwise. Live chat, audio and video sessions are billed per started minute, charged in advance for each minute by our servers; audio and video billing starts only when both you and the Astrologer are connected. Scheduled bookings are paid in full at the time of booking.', 'Wallet balance is a prepaid instrument for use on Astro Rahu only. It is not a bank account, earns no interest and cannot be transferred. Promotional or bonus credit may carry an expiry, shown at the time it is granted. Wallet recharges are processed by Razorpay (India) and Stripe (international); we do not store your card or UPI details.']],
    ['6. Acceptable use', ['You agree not to: harass or abuse Astrologers or staff; share or request phone numbers, email addresses, payment details or links to move a consultation off the platform; record a session without the other party’s consent; use the service for anything unlawful, including requests relating to black magic, harm to any person, or discrimination; or attempt to access accounts, data or systems you are not authorised to access.', 'We may suspend or terminate accounts that breach these Terms. Unused paid wallet balance of a terminated account will be refunded to the original payment method less any amounts owed, except where prohibited by law or in cases of fraud.']],
    ['7. Reviews', ['Only users who have completed a consultation or booking with an Astrologer may review them. Reviews must be honest and must not contain personal data, abusive content or advertising. We may moderate reviews that breach these rules.']],
    ['8. Intellectual property', ['The Astro Rahu name, logo, design, horoscope content and software belong to Astro Rahu or its licensors. Kundli charts you generate are yours for personal use.']],
    ['9. Liability', ['To the extent permitted by law, Astro Rahu’s total liability for any claim relating to a consultation is limited to the amount you paid for that consultation. Nothing in these Terms limits liability that cannot be limited under applicable law, including under the Consumer Protection Act, 2019.']],
    ['10. Governing law and disputes', ['These Terms are governed by the laws of India. Please first contact our Grievance Officer; unresolved disputes are subject to the courts at Bengaluru, Karnataka, without prejudice to your rights to approach a consumer commission.']],
    ['11. Changes', ['We may update these Terms. Material changes will be notified in the app and you will be asked to accept the new version before continuing to use the service.']],
  ] },
  privacy: { title: 'Privacy Policy', sections: [
    ['1. Who we are', [`${COMPANY.legalName}, ${COMPANY.address}, is the Data Fiduciary for personal data processed through Astro Rahu under the Digital Personal Data Protection Act, 2023 (“DPDP Act”). Contact: ${COMPANY.privacyEmail}.`]],
    ['2. Data we collect', ['Account data: name, email, phone, password (stored hashed by our authentication provider) or Google sign-in identifier.', 'Birth details you choose to provide: date, time and place of birth, gender and zodiac sign — used to generate Kundli charts and to help Astrologers guide you.', 'Consultation data: chat messages, voice notes you send, call metadata (start/end times, duration). Audio and video calls are not recorded.', 'Payment data: amounts, status and provider references. Card/UPI details are handled by Razorpay or Stripe and never stored by us.', 'Astrologer KYC data: PAN, masked Aadhaar (last 4 digits only), bank account (masked), and an identity document stored in private, access-controlled storage.', 'Technical data: IP address, device and browser information, and consent records.']],
    ['3. Why we use it (purposes)', ['To provide consultations, bookings, Kundli and horoscopes; process payments, refunds and payouts; prevent fraud and abuse; provide customer support; comply with tax and legal obligations; and, only with your separate opt-in, send marketing communications.']],
    ['4. Legal basis and consent', ['We process your data on the basis of your consent given at sign-up and for legitimate uses permitted under the DPDP Act (such as complying with law). You can withdraw consent at any time from Profile → Privacy; this will not affect processing already carried out, and some features may stop working.']],
    ['5. Sharing', ['With the Astrologer you consult (your name, the messages you send and birth details you share in that consultation). With processors acting on our instructions: Supabase (database, authentication, storage), Vercel (hosting), Razorpay and Stripe (payments), LiveKit (real-time audio/video transport). With authorities where required by law. We never sell your personal data.']],
    ['6. Storage and security', ['Data is encrypted in transit (TLS). Voice notes and KYC documents are stored in private buckets and are only accessible through short-lived signed links issued after an authorisation check. Access to personal data is restricted by role. Some processors may store data outside India, subject to safeguards and to any restrictions notified under the DPDP Act.']],
    ['7. Retention', ['Account and consultation data are kept while your account is active. When you delete your account we erase profile, birth details, Kundlis and favourites, and anonymise reviews. Financial records (wallet ledger, payments, invoices) are retained in anonymised form for 8 years as required by Indian tax law.']],
    ['8. Your rights', ['You may access and download your data (Profile → Privacy → Download my data), correct it, request erasure (Profile → Privacy → Delete account), nominate another person to exercise your rights in the event of death or incapacity, and raise a grievance with our Grievance Officer. If unsatisfied, you may approach the Data Protection Board of India.']],
    ['9. Children', ['Astro Rahu is for users aged 18 and above. We do not knowingly process children’s data; if you believe a child has created an account, contact us and we will delete it.']],
    ['10. Breach notification', ['In the event of a personal data breach we will notify affected users and the Data Protection Board as required by the DPDP Act.']],
  ] },
  refunds: { title: 'Refund & Cancellation Policy', sections: [
    ['Live consultations', ['You are charged per started minute only while the session is active and, for audio/video, only while both parties are connected. If the Astrologer does not connect within 90 seconds you are not charged. If a session ends due to a technical fault on our side, contact support within 7 days for a review and credit.']],
    ['Scheduled bookings', ['Cancel 2 hours or more before the start time: 100% refund to your wallet. Cancel less than 2 hours before: 50% refund. After the start time: no refund. If the Astrologer cancels or does not attend, you receive a 100% refund.', 'Rescheduling is free up to the start time, subject to the Astrologer’s availability.']],
    ['Wallet recharges', ['Unused paid wallet balance can be refunded to the original payment method on request (bonus credit excluded) within 180 days of recharge. Refunds are processed within 5–7 working days of approval; the time to reflect in your account depends on your bank.', 'If money was debited but your wallet was not credited, it is usually auto-reversed by the bank within 5–7 working days. You can also raise a ticket with the payment reference and we will reconcile it with the payment provider.']],
    ['How to request', [`Use Dashboard → Support, or email ${COMPANY.supportEmail} with your booking reference or payment ID.`]],
  ] },
  disclaimer: { title: 'Disclaimer', sections: [
    ['Guidance, not guarantees', ['Astrology, tarot, numerology, Vastu and related practices are traditional belief systems. Consultations on Astro Rahu are provided for insight, reflection and entertainment. They are not scientifically validated and do not guarantee any outcome.']],
    ['Not professional advice', ['Nothing on Astro Rahu is medical, psychological, legal, financial, or investment advice. Always consult a qualified professional. If you are in crisis or thinking of harming yourself, contact emergency services or the Tele-MANAS helpline (14416) immediately.']],
    ['Remedies and products', ['Astrologers may suggest remedies such as mantras or gemstones. Astro Rahu does not sell remedies through consultations, and you should never feel pressured to purchase anything. Report any pressure selling to our Grievance Officer.']],
    ['Independent astrologers', ['Astrologers are independent professionals. Their views are their own. Astro Rahu verifies identity (KYC) but does not endorse any particular prediction.']],
  ] },
  'astrologer-agreement': { title: 'Astrologer Agreement (summary)', sections: [
    ['Onboarding', ['To offer consultations you must complete KYC (PAN, Aadhaar via masked verification, bank account), accept this agreement and be linked to an astrologer profile by Astro Rahu. The verified badge is shown only after KYC approval.']],
    ['Conduct', ['You must: never guarantee outcomes; never claim to cure illness; never request contact details or off-platform payment; never pressure users to buy remedies; keep all consultations confidential; and respect users of every religion, caste, gender and orientation. Breaches may lead to suspension and withholding of payouts for affected sessions.']],
    ['Earnings and payouts', ['You set your per-minute rates within platform limits. Astro Rahu retains a platform commission shown in your dashboard. Payouts are made to your verified bank account after KYC approval, subject to minimum withdrawal amounts and applicable TDS under the Income-tax Act. You are responsible for your own GST registration where applicable.']],
    ['Data protection', ['You may only use user data to provide the consultation. You must not copy, store or share user birth details, messages or voice notes outside the platform.']],
    ['Full agreement', [`The full signed agreement is provided during onboarding. Contact ${COMPANY.supportEmail} for a copy.`]],
  ] },
  grievance: { title: 'Grievance Redressal', sections: [
    ['Grievance Officer', [`In accordance with the Consumer Protection (E-Commerce) Rules, 2020, the Information Technology Act, 2000 and the DPDP Act, 2023: ${COMPANY.grievanceOfficer}, ${COMPANY.legalName}, ${COMPANY.address}. Email: ${COMPANY.grievanceEmail}. Phone: ${COMPANY.phone} (Mon–Sat, 10:00–18:00 IST).`]],
    ['Timelines', ['We acknowledge every grievance within 48 hours and aim to resolve it within 30 days (or sooner where the law requires).']],
    ['Company information', [`${COMPANY.legalName} · ${COMPANY.cin} · ${COMPANY.gstin} · ${COMPANY.address}.`]],
    ['Escalation', ['If you are not satisfied with our resolution you may approach the National Consumer Helpline (1915 / consumerhelpline.gov.in), the appropriate Consumer Commission, or — for personal data matters — the Data Protection Board of India.']],
  ] },
};

const ORDER = ['terms', 'privacy', 'refunds', 'disclaimer', 'astrologer-agreement', 'grievance'];

export default function Legal() {
  const { doc = 'terms' } = useParams();
  const d = DOCS[doc] || DOCS.terms;
  return (
    <div>
      <section className="relative bg-plum-grad overflow-hidden">
        <StarField count={30} seed={121} color="#E8CD8A" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <p className="text-[11px] tracking-[0.35em] uppercase text-gold-light font-medium">Legal</p>
          <h1 className="font-display text-4xl text-white mt-3">{d.title}</h1>
          <p className="text-white/60 text-sm mt-2">Effective {COMPANY.effective} · Version {COMPANY.version}</p>
        </div>
      </section>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 grid lg:grid-cols-[220px_1fr] gap-6">
        <nav className="flex lg:flex-col gap-1 overflow-x-auto scrollbar-none lg:sticky lg:top-24 h-fit">
          {ORDER.map((k) => <NavLink key={k} to={`/legal/${k}`} className={({ isActive }) => `chip lg:!rounded-xl lg:!justify-start lg:!py-2 shrink-0 ${isActive || (k === 'terms' && !DOCS[doc]) ? 'chip-active' : ''}`}><FileText className="h-3.5 w-3.5" />{DOCS[k].title}</NavLink>)}
        </nav>
        <article className="card p-6 sm:p-10 space-y-7">
          {d.sections.map(([h, ps]) => (
            <section key={h}>
              <h2 className="font-serif text-2xl font-semibold text-plum">{h}</h2>
              {ps.map((p, i) => <p key={i} className="text-ink/80 leading-relaxed mt-2">{p}</p>)}
            </section>
          ))}
          <p className="text-xs text-muted border-t border-line pt-5">Questions? Write to <a href={`mailto:${COMPANY.supportEmail}`} className="text-rose-deep">{COMPANY.supportEmail}</a> or see <Link to="/legal/grievance" className="text-rose-deep">Grievance Redressal</Link>.</p>
        </article>
      </div>
    </div>
  );
}
