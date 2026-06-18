import type { Dict, Locale } from "./config";

export const dictionaries: Record<Locale, Dict> = {
  en: {
    "nav.about": "About",
    "nav.debug": "Debug",

    "home.guest": "Sign in via the Telegram button at the top right.",
    "home.signedInAs": "Signed in as {name}.",
    "home.profile": "Profile",

    "about.title": "About",
    "about.tba": "TBA",

    "profile.fallbackName": "Telegram user",
    "profile.id": "Telegram ID",
    "profile.name": "Name",
    "profile.username": "Username",
    "profile.logout": "Log out",

    "debug.title": "Debug — roostr generator",
    "debug.subtitle":
      "Client-side composition roll. No art / DB yet — emoji + CSS to feel the variety and rarity.",
    "debug.rolls": "Rolls: {count}",
    "debug.hatch": "Hatch",
    "debug.press": "Press Hatch to roll.",
  },
  ru: {
    "nav.about": "О проекте",
    "nav.debug": "Дебаг",

    "home.guest": "Войди через кнопку Telegram справа сверху.",
    "home.signedInAs": "Вошёл как {name}.",
    "home.profile": "Профиль",

    "about.title": "О проекте",
    "about.tba": "Скоро",

    "profile.fallbackName": "Пользователь Telegram",
    "profile.id": "Telegram ID",
    "profile.name": "Имя",
    "profile.username": "Юзернейм",
    "profile.logout": "Выйти",

    "debug.title": "Дебаг — генератор петухов",
    "debug.subtitle":
      "Клиентский ролл композиции. Пока без арта/БД — эмодзи + CSS, чтобы прочувствовать вариативность и редкость.",
    "debug.rolls": "Роллов: {count}",
    "debug.hatch": "Вылупить",
    "debug.press": "Нажми «Вылупить» для ролла.",
  },
};
