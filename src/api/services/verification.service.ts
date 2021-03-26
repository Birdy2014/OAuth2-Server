import pug from 'pug';
import { ConfigReader } from '../../ConfigReader';
import { Logger } from '../../Logger';
import { getLanguage } from '../../i18n/translationProvider';
import { ServerError } from '../utils';

const verificationEmail = pug.compileFile(__dirname + "/../../views/email/verification.pug");
const emailChangeEmail = pug.compileFile(__dirname + "/../../views/email/change.pug");
const passwordResetEmail = pug.compileFile(__dirname + "/../../views/email/reset.pug");
const lang = getLanguage(ConfigReader.config.language);

/**
 *
 * @param {string} username
 * @param {string} email
 * @param {string} verification_code
 * @param {number} action - 0 for initial email verification, 1 for change email, 2 for forgot password
 */
export async function sendVerificationEmail(username: string, email: string, verification_code: string, action: number) {
    Logger.info("Sending verification email to " + email + "; action: " + action);
    const emailConfig = ConfigReader.config.email;
    let html: string;
    let text: string = "";
    switch (action) {
        case 0:
            html = verificationEmail({ username, url: `${ConfigReader.config.url}/verification?verification_code=${verification_code}`, lang });
            break;
        case 1:
            html = emailChangeEmail({ username, url: `${ConfigReader.config.url}/verification?verification_code=${verification_code}`, lang });
            break;
        case 2:
            html = passwordResetEmail({ username, url: `${ConfigReader.config.url}/reset_password?verification_code=${verification_code}`, lang });
            break;
        default:
            throw new ServerError(500, "Internal Server Error");
    }

    if (process.env.DEBUG) {
        console.log("Email html:\n" + html);
        return;
    }

    await ConfigReader.transporter.sendMail({
        from: `${emailConfig.name} <${emailConfig.from}>`,
        to: email,
        subject: 'Email verification',
        text: text,
        html: html
    });
}
