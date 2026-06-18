import type { Dict, Locale } from "./config";

export const dictionaries: Record<Locale, Dict> = {
  en: {
    "nav.about": "About",
    "nav.debug": "Debug",
    "nav.collection": "Collection",
    "nav.market": "Market",
    "nav.arena": "Arena",
    "nav.friends": "Friends",
    "nav.support": "Support",
    "nav.settings": "Settings",
    "nav.bank": "Bank",
    "nav.login": "Log in:",

    "currency.coin": "Corn Coin",
    "resource.feathers": "Feathers",
    "bank.title": "Bank",
    "bank.balance": "Balance",
    "bank.empty": "No transactions yet.",
    "bank.topup": "Top up (soon)",

    "home.guest": "Sign in via the Telegram button in the sidebar.",
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
    "nav.collection": "Коллекция",
    "nav.market": "Рынок",
    "nav.arena": "Арена",
    "nav.friends": "Друзья",
    "nav.support": "Поддержка",
    "nav.settings": "Настройки",
    "nav.bank": "Банк",
    "nav.login": "Войти:",

    "currency.coin": "Corn Coin",
    "resource.feathers": "Перья",
    "bank.title": "Банк",
    "bank.balance": "Баланс",
    "bank.empty": "Пока операций нет.",
    "bank.topup": "Пополнить (скоро)",

    "home.guest": "Войди через кнопку Telegram в меню слева.",
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
