const es6Renderer = require('express-es6-template-engine');
const fs = require("fs");
const userService = require("./user.service");
const configReader = require("../../configReader");
const db = require("../../db");
const verificationEmail = es6Renderer(fs.readFileSync(__dirname + "/../../views/email/verification.html"), "username, url");
const emailChangeEmail = es6Renderer(fs.readFileSync(__dirname + "/../../views/email/change.html"), "username, url");
const passwordResetEmail = es6Renderer(fs.readFileSync(__dirname + "/../../views/email/reset.html"), "username, url");

/**
 * 
 * @param {string} verification_code 
 * @param {string} [password] 
 * @returns {Promise<string>}
 */
exports.validateVerificationCode = async (verification_code, password) => {
    let result = await db.query(`SELECT user_id, email, change_password FROM verification_code WHERE verification_code = '${verification_code}'`);
    if (result.length === 0) throw { status: 403, error: "Invalid verification_code" };
    let { user_id, email, change_password } = result[0];

    await db.query(`DELETE FROM verification_code WHERE verification_code = '${verification_code}'`);
    await db.query(`UPDATE user SET verified = true WHERE user_id = '${user_id}'`);
    if (email) {
        //change email
        if (!email) throw { status: 400, error: "Invalid arguments" };
        await db.query(`UPDATE user SET email = '${email}' WHERE user_id = '${user_id}'`);
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
    const emailConfig = configReader.config.email;
    let html;
    let text;
    switch (action) {
        case 0:
            html = verificationEmail(username, `${configReader.config.url}/verification?verification_code=${verification_code}`);
            break;
        case 1:
            html = emailChangeEmail(username, `${configReader.config.url}/verification?verification_code=${verification_code}`);
            break;
        case 2:
            html = passwordResetEmail(username, `${configReader.config.url}/reset_password?verification_code=${verification_code}`);
            break;
        default:
            html = verificationEmail(username, `${configReader.config.url}/verification?verification_code=${verification_code}`);
    }

    if (process.env.DEBUG) {
        if (action === 2)
            console.log("Email Link: " + `${configReader.config.url}/reset_password?verification_code=${verification_code}`);
        else
            console.log("Email Link: " + `${configReader.config.url}/verification?verification_code=${verification_code}`);
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