import fs from 'fs';
import { ConfigReader } from '../ConfigReader';
import { Logger } from '../Logger';

export interface Language {
    [key: string]: string;
}

let fallbackLang: Language;
try {
    fallbackLang = require(__dirname + "/" + ConfigReader.config.language);
} catch(e) {
    Logger.error("Cannot find fallback language '" + ConfigReader.config.language + "'");
    fallbackLang = {};
}
let languages: string[] = [];
for (let lang of fs.readdirSync(__dirname)) {
    if (lang.endsWith(".json")) {
        languages.push(lang.substring(0, lang.lastIndexOf(".")));
    }
}

export function getLanguages(): string[] {
    return languages;
}

export function getLanguage(code: string|boolean): (key: string) => string {
    let lang: Language;
    try {
        lang = require(__dirname + "/" + code);
    } catch(e) {
        lang = {};
        Logger.info("Cannot find requested language '" + code + "'");
    }
    return (key, ...params) => {
        let translation = lang[key] || fallbackLang[key] || lang.missingTranslation || fallbackLang.missingTranslation;
        for (let i = 0; i < params.length; i++) {
            translation = translation.replace("%" + i, params[i]);
        }
        return translation;
    }
}
