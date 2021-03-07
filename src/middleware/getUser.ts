import { Request, Response, NextFunction } from 'express';
import { handleError } from '../api/utils';
import { User } from '../api/services/User';
import { Client } from '../api/services/Client';

//get information about the current user and client from the access_token, refresh_token, authorization_code or username/password and attach it (including wether the access_token, refresh_token etc was send) to req
async function getUser(req: Request, res: Response, next: NextFunction) {
    try {
        //user and client
        if ((req.header("Authorization") && !req.header("Authorization")!.startsWith("Basic")) || req.body.access_token || req.cookies.access_token) {
            let access_token = req.body.access_token || req.header("Authorization") || req.cookies.access_token;
            try {
                req.user = await User.fromAccessToken(access_token);
                req.client = await Client.fromAccessToken(access_token);
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
                req.user = await User.fromRefreshToken(refresh_token);
                req.client = await Client.fromRefreshToken(refresh_token);
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
