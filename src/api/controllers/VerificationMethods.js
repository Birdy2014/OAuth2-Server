const { respond, handleError, generateToken } = require("../utils");
const { getUserId } = require("../services/user.service");
const { sendVerificationEmail, validateVerificationCode } = require("../services/verification.service");
const DBInterface = require("../../DBInterface");
const dbInterface = new DBInterface();

async function post(req, res) {
    try {
        if (!req.body.verification_code)
            throw { status: 400, error: "Invalid arguments" };

        let email = await validateVerificationCode(req.body.verification_code, req.body.password);
        respond(res, 200, { email });
    } catch (e) {
        handleError(res, e);
    }
}

//forgot password
async function put(req, res) {
    try {
        if (!req.body.login)
            throw { status: 400, error: "Invalid arguments" };

        let user_id = await getUserId(req.body.login);
        await dbInterface.query(`DELETE FROM verification_code WHERE user_id = '${user_id}'`); //delete old verification codes
        let verification_code = generateToken(12);
        let { username, email } = (await dbInterface.query(`SELECT username, email FROM user WHERE user_id = '${user_id}'`))[0];
        await dbInterface.query(`INSERT INTO verification_code (user_id, verification_code, change_password) VALUES ('${user_id}', '${verification_code}', '1')`);
        await sendVerificationEmail(username, email, verification_code, 2);
    } catch (e) {
        handleError(res, e);
    }
}

module.exports = { post, put }