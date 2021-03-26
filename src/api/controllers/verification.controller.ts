import express from 'express';
import { respond, generateToken, ServerError } from '../utils';
import { sendVerificationEmail } from '../services/verification.service';
import { Database } from '../../db/db';
import { User } from '../services/User';

export async function post(req: express.Request, res: express.Response) {
    if (!req.body.verification_code)
        throw new ServerError(400, "Invalid arguments");

    let user = await User.fromVerificationCode(req.body.verification_code, req.body.password);
    await user.save();
    respond(res, 200, { email: user.email });
}

//forgot password
export async function put(req: express.Request, res: express.Response) {
    if (!req.body.login)
        throw new ServerError(400, "Invalid arguments");

    let user = await User.fromLogin(req.body.login);
    await Database.delete('verification_code', `user_id = '${user.user_id}'`); //delete old verification codes
    let verification_code = generateToken(12);
    await Database.insert("verification_code", { user_id: user.user_id, verification_code, change_password: 1 });
    await sendVerificationEmail(user.username, user.email, verification_code, 2);
    respond(res, 200);
}
