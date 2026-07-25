import { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

const RUPPIN_LINKS = [
  { label: 'מידע לחוקרים — רשות המחקר', href: 'https://www.ruppin.ac.il/research-authority/researcher-information/' },
  { label: 'תקנות ונהלים — סגל אקדמי',  href: 'https://www.ruppin.ac.il/administrative-services/regulations-and-procedures-staff/' },
];

const RESEARCHER_SECTIONS = [
  {
    title: 'רשימת מחקרים',
    items: [
      'כרטיסי סיכום לכל מחקר: תקציב, הוצאות, יתרה ואחוז ניצול',
      'חיפוש וסינון לפי שם מחקר, סטטוס ומרכז מחקר',
    ],
  },
  {
    title: 'דף מחקר',
    items: [
      'סקירה כללית — תקציב, ניצול וגרף לפי קטגוריות',
      'צוות המחקר — הוספה והסרה של חברי צוות',
      'עוזרי מחקר — שעות, שכר ותקציב לכל עוזר',
      'מסמכים — העלאה, צפייה והורדת קבצים',
      'ריכוז תנועות — כל ההוצאות המאושרות',
      'הוצאות עתידיות — התחייבויות צפויות שמשפיעות על היתרה',
      'בקשות תשלום — הגשה, מעקב ועדכון סטטוס',
      'העברת תקציב — בקשה להעברה בין קטגוריות או בין מחקרים',
      'היסטוריית שינויים — יומן פעולות מלא',
    ],
  },
  {
    title: 'הגשת בקשת תשלום',
    items: [
      'ניתן להעלות חשבונית — המערכת תזהה את הפרטים אוטומטית',
      'בדקו ותקנו: סכום, תאריך, ספק, קטגוריה',
      'הבקשה תישלח למזכירות לאישור',
    ],
  },
  {
    title: 'השוואות בין מחקרים והמלצות',
    items: [
      'השוואה גרפית של ניצול תקציב בין מחקרים',
      'קיבוץ מחקרים לפי דפוסי הוצאות',
      'המלצות להעברת תקציב בין מחקרים',
    ],
  },
  {
    title: 'ייצוא דוחות',
    items: [
      'ייצוא Excel עם הקפאת כותרות וסינון אוטומטי',
      'ייצוא PDF עם כותרות חוזרות ו-RTL מלא',
    ],
  },
  {
    title: 'מידע ונהלים — מכללת רופין',
    items: [],
    links: RUPPIN_LINKS,
  },
];

const ASSISTANT_SECTIONS = [
  {
    title: 'דיווח נוכחות',
    items: [
      'בחרו מחקר וחודש, הזינו שעות לכל יום ולחצו "שלח לאישור"',
      'לא ניתן לערוך דיווח שכבר נשלח לאישור',
      'שכחתם חודש? פנו למזכירות לפתיחת עריכה',
    ],
  },
  {
    title: 'הדוחות שלי',
    items: [
      'צפייה בכל הדוחות שהגשתם עם סטטוס: ממתין / אושר / נדחה',
      'סינון לפי מחקר, חיפוש ידני וייצוא Excel / PDF',
      'אם דוח נדחה — תוצג סיבת הדחייה',
    ],
  },
];

const SECRETARY_SECTIONS = [
  {
    title: 'אישורים ממתינים',
    items: [
      'אישור או דחייה (עם סיבה) של בקשות תשלום ודוחות שעות',
      'בקשות חשודות מסומנות אוטומטית לבדיקה',
      'חיפוש וסינון לפי מחקר, קטגוריה, סכום ותאריך',
    ],
  },
  {
    title: 'היסטוריית שינויים',
    items: [
      'יומן מלא של כל הפעולות במערכת — מה שונה, מי שינה ומתי',
      'ייצוא לאקסל בפורמט מאורגן',
    ],
  },
  {
    title: 'ניהול משתמשים',
    items: [
      'הוספה ועדכון של משתמשים',
      'חיפוש לפי שם, תעודת זהות ותפקיד',
    ],
  },
  {
    title: 'מידע ונהלים — מכללת רופין',
    items: [],
    links: RUPPIN_LINKS,
  },
];

// FAQ per role — assistants only see the password question
const FAQ_ALL = [
  { q: 'איך מאפסים סיסמה?', a: 'פנו למזכירות לאיפוס, או שנו אותה בעצמכם מדף הפרופיל.' },
  { q: 'הועלה מסמך — למה לא זוהו פרטים אוטומטית?', a: 'הזיהוי האוטומטי עובד עם PDF, JPG, PNG ו-WebP. ודאו שהמסמך קריא. אם לא זוהו פרטים, ניתן למלא ידנית.' },
  { q: 'בקשת תשלום נדחתה — מה עושים?', a: 'ראו את סיבת הדחייה בכרטיס הבקשה והגישו בקשה חדשה עם המסמכים הנדרשים.' },
  { q: 'לא רואה את הכפתור "בקשת תשלום חדשה"', a: 'כפתור זה מופיע רק לחוקר ראשי. עוזרי מחקר אינם יכולים להגיש בקשות תשלום.' },
  { q: 'איך מוסיפים עוזר מחקר?', a: 'בדף המחקר, עברו לטאב "עוזרי מחקר" ולחצו "הוסף עוזר מחקר". הזינו את תעודת הזהות — העוזר חייב להיות רשום במערכת.' },
];
const FAQ_ASSISTANT = FAQ_ALL.filter((_, i) => i === 0);

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-right hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-800">{q}</span>
        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 text-sm text-gray-600 leading-relaxed border-t border-gray-100 bg-gray-50/50">
          {a}
        </div>
      )}
    </div>
  );
}

function SectionList({ sections }) {
  return (
    <div className="space-y-3 mb-10">
      {sections.map(sec => (
        <div key={sec.title} className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
          <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-bold text-primary tracking-wide">{sec.title}</span>
          </div>
          <div className="px-5 py-3.5">
            {sec.items.length > 0 && (
              <ul className="space-y-2">
                {sec.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <svg className="w-3 h-3 text-primary/40 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                      <circle cx="10" cy="10" r="3" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            )}
            {sec.links && sec.links.length > 0 && (
              <ul className={`space-y-1.5 ${sec.items.length > 0 ? 'mt-3 pt-3 border-t border-gray-100' : ''}`}>
                {sec.links.map((link, i) => (
                  <li key={i}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
                    >
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HelpPage() {
  const { user } = useAuth();
  const role = user?.systemAuthorization;
  const isAssistant  = role === 'עוזר מחקר';
  const isSecretary  = role === 'מזכירות';

  // Tab definitions — each role sees only their own tab(s)
  const TABS = isAssistant
    ? [{ id: 'assistant', label: 'עוזר מחקר' }]
    : isSecretary
      ? [{ id: 'secretary', label: 'מזכירות' }]
      : [{ id: 'researcher', label: 'חוקרים' }];

  const SECTIONS_BY_TAB = {
    researcher: RESEARCHER_SECTIONS,
    assistant:  ASSISTANT_SECTIONS,
    secretary:  SECRETARY_SECTIONS,
  };

  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const sections  = SECTIONS_BY_TAB[activeTab] ?? RESEARCHER_SECTIONS;
  const faqItems  = isAssistant ? FAQ_ASSISTANT : FAQ_ALL;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto" dir="rtl">

        <div className="mb-8">
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">מרכז עזרה</h1>
          <p className="text-sm text-gray-400 mt-0.5 font-medium">מדריך שימוש במערכת RupResearch</p>
        </div>

        {/* Tab bar — hidden when only one tab (single role) */}
        {TABS.length > 1 && (
          <div className="flex gap-1.5 bg-gray-100/70 p-1.5 rounded-2xl w-fit mb-8">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 text-sm font-semibold rounded-xl whitespace-nowrap transition-all duration-150 ${
                  activeTab === t.id
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <SectionList sections={sections} />

        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">שאלות נפוצות</h2>
          <div className="space-y-2">
            {faqItems.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
          </div>
        </div>

      </div>
    </Layout>
  );
}
