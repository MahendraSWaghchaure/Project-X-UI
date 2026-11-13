import type { enUi } from './en.ui';
import type { Translations } from './types';

/** Hindi strings: shared UI chrome. Typed against the English tree so a missing key fails the build. */
export const hiUi: Translations<typeof enUi> = {
  ui: {
    cancel: 'रद्द करें',
    logoHome: 'Sunju - मुख्य पृष्ठ पर जाएँ',
    logoTagline: 'स्कूल बस सेवा',
    skipToContent: 'सामग्री पर जाएँ',
    mainNavigation: 'मुख्य नेविगेशन',
    sidebar: 'साइडबार नेविगेशन',
    theme: {
      label: 'थीम',
      auto: 'ऑटो',
      day: 'दिन',
      night: 'रात',
      current: '{{theme}} थीम दिख रही है',
    },
    footer: {
      callUs: '{{phone}} पर कॉल करें',
      emailUs: '{{email}} पर ईमेल करें',
      sendInquiry: 'पूछताछ भेजें',
    },
    inquiry: {
      title: 'हमें अपनी पूछताछ भेजें',
      intro: 'बताइए आपको क्या चाहिए, हम जल्द ही आपसे संपर्क करेंगे।',
      name: 'आपका नाम',
      contact: 'फ़ोन या ईमेल',
      contactHint: 'हम इसी नंबर या पते पर उत्तर देंगे।',
      message: 'संदेश',
      send: 'पूछताछ भेजें',
      sending: 'भेजा जा रहा है…',
      success: 'धन्यवाद! आपकी पूछताछ हमें मिल गई है, हम जल्द संपर्क करेंगे।',
      error: 'आपकी पूछताछ नहीं भेजी जा सकी। कृपया फिर कोशिश करें या सीधे हमसे संपर्क करें।',
      nameRequired: 'कृपया अपना नाम लिखें',
      contactRequired: 'कृपया फ़ोन नंबर या ईमेल लिखें',
      contactInvalid: 'सही फ़ोन नंबर या ईमेल पता लिखें',
      messageRequired: 'कृपया एक छोटा संदेश लिखें',
      messageTooLong: 'कृपया संदेश 2000 अक्षरों से कम रखें',
      reachUs: 'बात करना चाहते हैं? सीधे संपर्क करें',
      call: '{{phone}} पर कॉल करें',
      email: '{{email}} पर ईमेल करें',
    },
  },
};
