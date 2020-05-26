const fs = require("fs");
const configReader = require("../configReader");
const logger = require("../logger");
let fallbackLang;
try {
    fallbackLang = require(__dirname + "/" + configReader.config.language);
} catch(e) {
    logger.error("Cannot find fallback language '" + configReader.config.language + "'");
    fallbackLang = {};
}
let languages = [];
for (let lang of fs.readdirSync(__dirname)) {
    if (lang.endsWith(".json")) {
        languages.push(lang.substring(0, lang.lastIndexOf(".")));
    }
}

exports.getLanguages = () => {
    return languages;
}

exports.getLanguage = (code) => {
    let lang;
    try {
        lang = require(__dirname + "/" + code);
    } catch(e) {
        lang = {};
        logger.info("Cannot find requested language '" + code + "'");
    }
    return (key, ...params) => {
        let translation = lang[key] || fallbackLang[key] || lang.missingTranslation || fallbackLang.missingTranslation;
        for (let i = 0; i < params.length; i++) {
            translation = translation.replace("%" + i, params[i]);
        }
        return translation;
    }
}