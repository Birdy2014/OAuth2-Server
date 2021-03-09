import { Request, Response, NextFunction } from 'express';
import { handleError } from '../api/utils';
import { Token } from '../api/services/Token';

//get information about the current user and client from the access_token, refresh_token, authorization_code or username/password and attach it (including wether the access_token, refresh_token etc was send) to req
async function getUser(req: Request, res: Response, next: NextFunction) {
    try {
        //user and client
        if ((req.header("Authorization") && !req.header("Authorization")!.startsWith("Basic")) || req.body.access_token || req.cookies.access_token) {
            let access_token = req.body.access_token || req.header("Authorization") || req.cookies.access_token;
            try {
                req.token = await Token.fromAccessToken(access_token);
                req.user = req.token.user;
                req.client = req.token.client;
            } catch(err) {
                // TODO: check if error is invalid access_token using enum
                res.clearCookie('access_token');
                if (!req.cookies.refresh_token)
                    throw err;
            }
        }

        if (req.cookies.refresh_token) {
            let refresh_token = req.cookies.refresh_token;
            try {
                req.token = await Token.fromRefreshToken(refresh_token);
                req.user = req.token.user;
                req.client = req.token.client;
            } catch(err) {
                // TODO: check if error is invalid refresh_token using enum
                res.clearCookie('refresh_token');
                throw err;
            }
        }

        next();
    } catch (e) {
        handleError(res, e);
    }
}

module.exports = getUser;
