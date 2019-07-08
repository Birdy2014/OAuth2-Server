const request = require("request-promise-native");
const { requireValues, respond } = require("../utils");
const DBInterface = require("../../DBInterface");
const ConfigReader = require("../../ConfigReader");
const dbInterface = new DBInterface();
const configReader = new ConfigReader();

async function post(req, res) {
    if (!requireValues(req.body.verification_code)) return;

    let result = await dbInterface.query(`SELECT user.user_id AS user_id, user.email AS email, verification_code.email AS new_email FROM verification_code JOIN user ON verification_code.user_id = user.user_id WHERE verification_code = '${req.body.verification_code}'`);
    if (result.length > 0) {
        await dbInterface.query(`DELETE FROM verification_code WHERE verification_code = '${req.body.verification_code}'`);
        await dbInterface.query(`UPDATE user SET verified = true WHERE user_id = '${result[0].user_id}'`);
        if (result[0].new_email) { //change email
            await dbInterface.query(`UPDATE user SET email = '${result[0].new_email}' WHERE user_id = '${result[0].user_id}'`);
            respond(res, 200, {email: result[0].new_email});
        } else { //user registered
            respond(res, 200, {email: result[0].email});
        }
    } else {
        respond(res, 403);
    }
}

async function sendVerificationEmail(username, email, verification_code) {
    const emailConfig = configReader.emailConfig();
    let url;
    let body;
    switch (emailConfig.provider) {
        case "sendgrid": {
            url = "https://api.sendgrid.com/v3/mail/send";
            body = {
                from: {
                    "email": emailConfig.from
                },
                personalizations: [
                    {
                        to: [
                            {
                                email: email
                            }
                        ],
                        dynamic_template_data: {
                            username: username,
                            url: `${configReader.url()}/verification?verification_code=${verification_code}`
                        }
                    }
                ],
                template_id: emailConfig.template
            };
            break;
        }
        default: {
            console.error(`The email provider ${emailConfig.provider} is not supported. Please change it in the config file`);
            return;
        }
    }
    try {
        await request.post({
            url: url,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${emailConfig.key}`
            },
            json: body
        })
    } catch (e) {
        console.error(e);
    }
}

module.exports = { post, sendVerificationEmail }