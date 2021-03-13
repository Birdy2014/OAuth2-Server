import express from 'express';
import { respond, ServerError } from '../utils';
import { Database } from '../../db/db';
import { Token } from '../services/Token';

export async function tokenInfo(req: express.Request, res: express.Response) {
    if (!(req.header("Authorization") || (req.body.client_id && req.body.client_secret)) || !req.body.access_token)
        throw new ServerError(400, "Invalid arguments");

    let client_id: string, client_secret: string;
    if (req.header("Authorization")) {
        let access_token_raw = req.header("Authorization");
        if (access_token_raw!.startsWith("Basic "))
            access_token_raw = access_token_raw!.substring("Basic ".length);
        [client_id, client_secret] = Buffer.from(access_token_raw!, "base64").toString().split(":");
    } else {
        client_id = req.body.client_id;
        client_secret = req.body.client_secret;
    }
    let token = await Token.fromAccessToken(req.body.access_token);
    if (token.client.client_id !== client_id || token.client.client_secret !== client_secret)
        throw new ServerError(403, "Invalid access_token");

    let output = token.user.export(client_id);
    output.active = true;
    respond(res, 200, output);
}

export async function token(req: express.Request, res: express.Response) {
    switch (req.body.grant_type) {
        case "authorization_code": {
            if (!req.body.code || !req.body.client_id || !req.body.code_verifier)
                throw new ServerError(400, "Invalid arguments");

            let token = await Token.fromAuthorizationCode(req.body.code, req.body.code_verifier);
            let validClient = req.body.client_secret ? token.client.client_secret === req.body.client_secret : true;

            if (!validClient || token.client.client_id !== req.body.client_id)
                throw new ServerError(403, "Invalid authorization_code");

            let { token: refresh_token, expires } = await token.createRefreshToken();
            respond(res, 201, { refresh_token, expires });
            break;
        }
        case "refresh_token": {
            if (!req.body.refresh_token || !req.body.client_id)
                throw new ServerError(400, "Invalid arguments");

            let token = await Token.fromRefreshToken(req.body.refresh_token);
            if (token.client.client_id !== req.body.client_id)
                throw new ServerError(403, "Invalid refresh_token");

            let { token: access_token, expires } = await token.createAccessToken();
            respond(res, 201, { access_token, expires });
            break;
        }
        default:
            throw new ServerError(400, "Invalid arguments");
    }
}

export async function revoke(req: express.Request, res: express.Response) {
    let access_token = req.body.access_token;
    let refresh_token = req.body.refresh_token;

    if (!access_token && !refresh_token && (req.cookies.access_token || req.cookies.refresh_token)) {
        access_token = req.cookies.access_token;
        refresh_token = req.cookies.refresh_token;
        res.clearCookie("access_token");
        res.clearCookie("refresh_token");
    }

    if (!access_token && !refresh_token)
        throw new ServerError(400, "Invalid arguments");

    if (access_token) //revoke access_token
        await Database.query(`DELETE FROM access_token WHERE access_token = '${access_token}'`);

    if (refresh_token) //revoke refresh_token
        await Database.query(`DELETE FROM refresh_token WHERE refresh_token = '${refresh_token}'`);

    respond(res, 200);
}
