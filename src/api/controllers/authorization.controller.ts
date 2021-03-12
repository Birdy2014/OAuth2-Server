import express from 'express';
import { respond, ServerError } from '../utils';
import { User } from '../services/User';
import { Client } from '../services/Client';
import { Token } from '../services/Token';
import { Database } from '../../db/db';

export async function post(req: express.Request, res: express.Response) {
    if (!req.body.login || !req.body.password)
        throw new ServerError(400, "Invalid arguments");

    let user = await User.fromLoginPassword(req.body.login, req.body.password);

    let dashboard = await Client.fromId(Database.dashboard_id);
    let dashboardToken = await Token.create(user, dashboard);
    res.cookie("access_token", (await dashboardToken.createAccessToken()).token);
    res.cookie("refresh_token", (await dashboardToken.createRefreshToken()).token);

    if (!req.body.client_id || !req.body.redirect_uri || !req.body.code_challenge)
        return respond(res, 200, { redirect: "/dashboard" });

    let client = await Client.fromIdUri(req.body.client_id, req.body.redirect_uri);

    if (!(user.verified || client.name === "Dashboard"))
        throw new ServerError(400, "Email not verified");

    let token = await Token.create(user, client);
    let { token: authorization_code } = await token.createAuthorizationCode(req.body.code_challenge);
    respond(res, 201, { authorization_code, redirect: `${req.body.redirect_uri}${req.body.redirect_uri.includes("?") ? "&" : "?"}authorization_code=${authorization_code}${req.body.state === null ? "" : "&state=" + req.body.state}` });
}
