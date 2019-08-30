const { respond, handleError } = require("../utils");
const es6Renderer = require('express-es6-template-engine');
const fs = require("fs");
const DBInterface = require("../../DBInterface");
const ConfigReader = require("../../ConfigReader");
const dbInterface = new DBInterface();
const configReader = new ConfigReader();
const compiledEmail = es6Renderer(fs.readFileSync(__dirname + "/../../views/email/verification.html"), "username, url");

async function post(req, res) {
    try {
        if (!req.body.verification_code)
            throw { status: 400, error: "Invalid arguments" };

        let result = await dbInterface.query(`SELECT user.user_id AS user_id, user.email AS email, verification_code.email AS new_email FROM verification_code JOIN user ON verification_code.user_id = user.user_id WHERE verification_code = '${req.body.verification_code}'`);
        if (result.length > 0) {
            await dbInterface.query(`DELETE FROM verification_code WHERE verification_code = '${req.body.verification_code}'`);
            await dbInterface.query(`UPDATE user SET verified = true WHERE user_id = '${result[0].user_id}'`);
            if (result[0].new_email) { //change email
                await dbInterface.query(`UPDATE user SET email = '${result[0].new_email}' WHERE user_id = '${result[0].user_id}'`);
                respond(res, 200, { email: result[0].new_email });
            } else { //user registered
                respond(res, 200, { email: result[0].email });
            }
        } else {
            throw { status: 403, error: "Invalid verification_code" };
        }
    } catch (e) {
        handleError(res, e);
    }
}

async function sendVerificationEmail(username, email, verification_code) {
    const emailConfig = configReader.emailConfig();

    await configReader.getMailTransporter().sendMail({
        from: `${emailConfig.name} <${emailConfig.from}>`,
        to: email,
        subject: 'Email verification',
        text: `url: ${configReader.url()}/verification?verification_code=${verification_code}`,
        html: compiledEmail(username, `${configReader.url()}/verification?verification_code=${verification_code}`)
    });
}

module.exports = { post, sendVerificationEmail }