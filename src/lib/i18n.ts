import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

/**
 * Scoped to the highest-traffic parent/driver screens (login, track-bus, notifications, SOS,
 * attendance) for this pass, not a full-app translation audit - see the plan doc for why.
 */
const resources = {
  en: {
    translation: {
      login: {
        title: 'Sign in',
        email: 'Email',
        password: 'Password',
        submit: 'Sign in',
        forgotPassword: 'Forgot password?',
        passwordResetSuccess: 'Password reset - sign in with your new password.',
      },
      trackBus: {
        title: 'Track Bus',
        status: 'Status',
        liveConnection: 'Live connection',
        connected: 'connected',
        connecting: 'connecting…',
        noPosition: "No live position yet for this child's bus.",
        confirmHomeArrival: 'Confirm my child reached home safely',
        confirmSuccess: 'Thanks, marked as confirmed.',
        confirmError: 'Could not confirm right now — there may be no drop-off trip today yet.',
        yourDriver: 'Your driver today',
        verified: 'Background verified',
        rejected: 'Verification failed',
        pending: 'Verification pending',
        callDriver: 'Call driver',
        sosBanner: 'SOS alert triggered on this bus. The school has been notified.',
      },
      notifications: {
        title: 'Notifications',
      },
      attendance: {
        title: 'Attendance history',
        last30Days: 'Last 30 days',
        markAbsent: 'Mark absent',
        notRiding: 'Not riding that day',
        clear: 'Clear',
        boardingQr: 'Boarding QR code',
        inviteGuardian: 'Invite second guardian',
      },
    },
  },
  hi: {
    translation: {
      login: {
        title: 'साइन इन करें',
        email: 'ईमेल',
        password: 'पासवर्ड',
        submit: 'साइन इन करें',
        forgotPassword: 'पासवर्ड भूल गए?',
        passwordResetSuccess: 'पासवर्ड रीसेट हो गया - अपने नए पासवर्ड से साइन इन करें।',
      },
      trackBus: {
        title: 'बस ट्रैक करें',
        status: 'स्थिति',
        liveConnection: 'लाइव कनेक्शन',
        connected: 'जुड़ा हुआ',
        connecting: 'जुड़ रहा है…',
        noPosition: 'इस बच्चे की बस की अभी कोई लाइव स्थिति नहीं है।',
        confirmHomeArrival: 'पुष्टि करें कि मेरा बच्चा सुरक्षित घर पहुंच गया',
        confirmSuccess: 'धन्यवाद, पुष्टि दर्ज कर दी गई।',
        confirmError: 'अभी पुष्टि नहीं हो सकी — शायद आज कोई ड्रॉप-ऑफ ट्रिप नहीं है।',
        yourDriver: 'आज आपका ड्राइवर',
        verified: 'पृष्ठभूमि सत्यापित',
        rejected: 'सत्यापन विफल',
        pending: 'सत्यापन लंबित',
        callDriver: 'ड्राइवर को कॉल करें',
        sosBanner: 'इस बस पर एसओएस अलर्ट भेजा गया। स्कूल को सूचित कर दिया गया है।',
      },
      notifications: {
        title: 'सूचनाएं',
      },
      attendance: {
        title: 'उपस्थिति इतिहास',
        last30Days: 'पिछले 30 दिन',
        markAbsent: 'अनुपस्थित चिह्नित करें',
        notRiding: 'उस दिन यात्रा नहीं करेगा',
        clear: 'साफ़ करें',
        boardingQr: 'बोर्डिंग क्यूआर कोड',
        inviteGuardian: 'दूसरे अभिभावक को आमंत्रित करें',
      },
    },
  },
};

/** Exported so tests can await readiness before rendering - see src/test/setup.ts. init() resolves asynchronously even with inline resources (no HTTP backend), so a component under test can otherwise render before translations are loaded and see raw keys instead of resolved strings. */
export const i18nReady = i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
