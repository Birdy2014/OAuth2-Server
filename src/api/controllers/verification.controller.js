const { respond, handleError, generateToken } = require("../utils");
const { getUserFromLogin } = require("../services/user.service");
const { sendVerificationEmail, validateVerificationCode } = require("../services/verification.service");
const db = require("../../db");

exports.post = async (req, res) => {
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
exports.put = async (req, res) => {
    try {
        if (!req.body.login)
            throw { status: 400, error: "Invalid arguments" };

        let { user_id } = await getUserFromLogin(req.body.login);
        await db.query(`DELETE FROM verification_code WHERE user_id = '${user_id}'`); //delete old verification codes
        let verification_code = generateToken(12);
        let { username, email } = (await db.query(`SELECT username, email FROM user WHERE user_id = '${user_id}'`))[0];
        await db.insert("verification_code", { user_id, verification_code, change_password: 1 });
        await sendVerificationEmail(username, email, verification_code, 2);
        respond(res, 200);
    } catch (e) {
        handleError(res, e);
    }
}
