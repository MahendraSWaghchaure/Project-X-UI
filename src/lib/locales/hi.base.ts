import type { enBase } from './en.base';
import type { Translations } from './types';

export const hiBase: Translations<typeof enBase> = {
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
    selectChild: 'बच्चा चुनें',
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
    inviteGuardian: 'अभिभावक को आमंत्रित करें',
  },
};
