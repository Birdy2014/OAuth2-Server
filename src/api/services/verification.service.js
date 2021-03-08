const pug = require('pug');
const userService = require("./user.service");
const configReader = require("../../configReader");
const { Database } = require("../../db/db");
const logger = require("../../logger");
const translationProvider = require("../../i18n/translationProvider");
const verificationEmail = pug.compileFile(__dirname + "/../../views/email/verification.pug");
const emailChangeEmail = pug.compileFile(__dirname + "/../../views/email/change.pug");
const passwordResetEmail = pug.compileFile(__dirname + "/../../views/email/reset.pug");
const lang = translationProvider.getLanguage(configReader.config.language);

/**
 *
 * @param {string} verification_code
 * @param {string} [password]
 * @returns {Promise<string>}
 */
exports.validateVerificationCode = async (verification_code, password) => {
    let result = await Database.query(`SELECT user_id, email, change_password FROM verification_code WHERE verification_code = '${verification_code}'`);
    if (result.length === 0) throw { status: 403, error: "Invalid verification_code" };
    let { user_id, email, change_password } = result[0];

    await Database.query(`DELETE FROM verification_code WHERE verification_code = '${verification_code}'`);
    await Database.query(`UPDATE user SET verified = true WHERE user_id = '${user_id}'`);
    if (email) {
        //change email
        if (!email) throw { status: 400, error: "Invalid arguments" };
        await Database.query(`UPDATE user SET email = '${email}' WHERE user_id = '${user_id}'`);
        return email;
    } else if (change_password) {
        //forgot password
        if (!password) throw { status: 400, error: "Invalid arguments" };
        await userService.changePassword(user_id, password);
        return "";
    } else {
        //user registered
        return email;
    }
}

/**
 *
 * @param {string} username
 * @param {string} email
 * @param {string} verification_code
 * @param {number} action - 0 for initial email verification, 1 for change email, 2 for forgot password
 */
exports.sendVerificationEmail = async (username, email, verification_code, action) => {
    logger.info("Sending verification email to " + email + "; action: " + action);
    const emailConfig = configReader.config.email;
    let html;
    let text;
    switch (action) {
        case 0:
            html = verificationEmail({ username, url: `${configReader.config.url}/verification?verification_code=${verification_code}`, lang });
            break;
        case 1:
            html = emailChangeEmail({ username, url: `${configReader.config.url}/verification?verification_code=${verification_code}`, lang });
            break;
        case 2:
            html = passwordResetEmail({ username, url: `${configReader.config.url}/reset_password?verification_code=${verification_code}`, lang });
            break;
        default:
            throw { status: 500, error: "Internal Server Error" };
    }

    if (process.env.DEBUG) {
        console.log("Email html:\n" + html);
        return;
    }

    await configReader.transporter.sendMail({
        from: `${emailConfig.name} <${emailConfig.from}>`,
        to: email,
        subject: 'Email verification',
        text: text,
        html: html
    });
}
