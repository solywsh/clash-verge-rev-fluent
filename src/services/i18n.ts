import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import ar from '@/locales/ar.json'
import en from '@/locales/en.json'
import fa from '@/locales/fa.json'
import id from '@/locales/id.json'
import ru from '@/locales/ru.json'
import tt from '@/locales/tt.json'
import zh from '@/locales/zh.json'

export const languages = { en, ru, zh, fa, tt, id, ar }

const resources = Object.fromEntries(
  Object.entries(languages).map(([key, value]) => [
    key,
    { translation: value },
  ]),
)

i18n.use(initReactI18next).init({
  resources,
  lng: 'zh',
  fallbackLng: 'zh',
  interpolation: {
    escapeValue: false,
  },
})
