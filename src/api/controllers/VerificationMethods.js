const { respond, handleError, generateToken } = require("../utils");
const bcrypt = require("bcrypt");
const { checkPassword, getUserId } = require("./UserMethods");
const { sendVerificationEmail } = require("../services/verification.service");
const DBInterface = require("../../DBInterface");
const dbInterface = new DBInterface();

async function post(req, res) {
    try {
        if (!req.body.verification_code)
            throw { status: 400, error: "Invalid arguments" };

        let result = await dbInterface.query(`SELECT user.user_id AS user_id, user.email AS email, verification_code.email AS new_email, verification_code.change_password AS change_password FROM verification_code JOIN user ON verification_code.user_id = user.user_id WHERE verification_code = '${req.body.verification_code}'`);
        if (result.length > 0) {
            await dbInterface.query(`DELETE FROM verification_code WHERE verification_code = '${req.body.verification_code}'`);
            await dbInterface.query(`UPDATE user SET verified = true WHERE user_id = '${result[0].user_id}'`);
            if (result[0].new_email) { //change email
                await dbInterface.query(`UPDATE user SET email = '${result[0].new_email}' WHERE user_id = '${result[0].user_id}'`);
                respond(res, 200, { email: result[0].new_email });
            } else if (result[0].change_password) { //forgot password
                if (!req.body.password) throw { status: 400, error: "Invalid arguments" };
                if (!await checkPassword(req.body.password)) throw { status: 400, error: "Invalid Password" };
                let password_hash = await bcrypt.hash(req.body.password, 12);
                await dbInterface.query(`UPDATE user SET password_hash = '${password_hash}' WHERE user_id = '${result[0].user_id}'`);
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