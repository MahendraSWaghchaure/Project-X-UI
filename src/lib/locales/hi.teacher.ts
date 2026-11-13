import type { enTeacher } from './en.teacher';
import type { Translations } from './types';

/** Hindi strings: teacher area. Typed against the English tree so a missing key fails the build. */
export const hiTeacher: Translations<typeof enTeacher> = {
  teacher: {
    dashboard: {
      title: 'आपका दिन',
      subtitle: 'आपकी कक्षा, आज के पीरियड और वह सब जिस पर आपका ध्यान चाहिए।',
      myClass: 'मेरी कक्षा',
      noClass: 'आप कक्षा शिक्षक नहीं हैं',
      openClass: 'उपस्थिति और छात्र खोलें',
      periodsToday: 'आज के पीरियड',
      openPeriods: 'मेरा टाइमटेबल देखें',
      alertsToday: 'आज के अलर्ट',
      openAlerts: 'अलर्ट देखें',
      lecturerClasses: 'जिन कक्षाओं में आप पढ़ाते हैं',
    },
    myClass: {
      noneTitle: 'आप कक्षा शिक्षक नहीं हैं',
      noneBody: 'उपस्थिति और छात्रों का विवरण कक्षा शिक्षक को मिलता है। अपने स्कूल एडमिन से कक्षा सौंपने को कहें।',
    },
    periods: {
      title: 'मेरे पीरियड',
      subtitle: 'आपका साप्ताहिक टाइमटेबल, दिन के अनुसार।',
      emptyTitle: 'अभी कोई पीरियड नहीं सौंपा गया',
      emptyBody: 'आप जो पीरियड पढ़ाते हैं उन्हें आपका स्कूल एडमिन जोड़ता है। वे यहाँ दिखेंगे।',
    },
    exams: {
      title: 'परीक्षाएँ',
      subtitle: 'जिन कक्षाओं में आप पढ़ाते हैं उनके परीक्षा परिणाम दर्ज करें और देखें।',
      noneTitle: 'अभी कोई पढ़ाने वाली कक्षा नहीं',
      noneBody: 'परीक्षा परिणाम उन कक्षाओं के लिए जोड़े जा सकते हैं जिनमें आपका कम से कम एक पीरियड है।',
      yourSubjects: 'आपके विषय: {{subjects}}',
      results: 'परिणाम',
      studentTitle: 'परीक्षा परिणाम: {{name}}',
    },
    alerts: {
      title: 'अलर्ट',
      subtitle: 'वे बच्चे जिन्हें बस ड्राइवर ने स्कूल छोड़ा लेकिन जो आपके रजिस्टर में उपस्थित दर्ज नहीं हैं।',
      emptyTitle: 'कोई अलर्ट नहीं',
      emptyBody: 'इस दिन के लिए किसी बात पर ध्यान देने की ज़रूरत नहीं है।',
      headline: 'स्कूल छोड़ा गया लेकिन उपस्थित दर्ज नहीं',
      student: 'छात्र',
      droppedAt: 'छोड़ने का समय',
      parent: 'अभिभावक',
      popupTitle: 'छात्र उपस्थित दर्ज नहीं',
      popupBody: 'ड्राइवर ने {{name}} को स्कूल छोड़ा, लेकिन वे उपस्थित दर्ज नहीं हैं। कृपया जाँचें।',
      viewAll: 'सभी अलर्ट देखें',
      nextOf: 'अगला ({{count}} और)',
      gotIt: 'समझ गया',
    },
  },
};
