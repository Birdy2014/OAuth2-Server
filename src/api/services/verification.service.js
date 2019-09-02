const es6Renderer = require('express-es6-template-engine');
const fs = require("fs");
const ConfigReader = require("../../ConfigReader");
const configReader = new ConfigReader();
const verificationEmail = es6Renderer(fs.readFileSync(__dirname + "/../../views/email/verification.html"), "username, url");
const emailChangeEmail = es6Renderer(fs.readFileSync(__dirname + "/../../views/email/change.html"), "username, url");
const passwordResetEmail = es6Renderer(fs.readFileSync(__dirname + "/../../views/email/reset.html"), "username, url");

/**
 * 
 * @param {string} username 
 * @param {string} email 
 * @param {string} verification_code 
 * @param {number} action - 0 for initial email verification, 1 for change email, 2 for forgot password
 */
async function sendVerificationEmail(username, email, verification_code, action) {
    const emailConfig = configReader.emailConfig();
    let html;
    let text;
    switch (action) {
        case 0:
            html = verificationEmail(username, `${configReader.url()}/verification?verification_code=${verification_code}`);
            break;
        case 1:
            html = emailChangeEmail(username, `${configReader.url()}/verification?verification_code=${verification_code}`);
            break;
        case 2:
            html = passwordResetEmail(username, `${configReader.url()}/reset_password?verification_code=${verification_code}`);
            break;
        default:
            html = verificationEmail(username, `${configReader.url()}/verification?verification_code=${verification_code}`);
    }

    if (process.env.DEBUG) {
        if (action === 2)
            console.log("Email Link: " + `${configReader.url()}/reset_password?verification_code=${verification_code}`);
        else
            console.log("Email Link: " + `${configReader.url()}/verification?verification_code=${verification_code}`);
        return;
    }

    await configReader.getMailTransporter().sendMail({
        from: `${emailConfig.name} <${emailConfig.from}>`,
        to: email,
        subject: 'Email verification',
        text: text,
        html: html
    });
}

module.exports = { sendVerificationEmail };