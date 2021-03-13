import express from 'express';
import { respond, ServerError } from '../utils';
import { getAllUsers } from '../services/user.service';
import { Database } from '../../db/db';
import configReader from '../../configReader';
import { User } from '../services/User';
import { Token } from '../services/Token';
import { Client } from '../services/Client';

export async function get(req: express.Request, res: express.Response) {
    if (!req.user!.admin || req.client!.name !== "Dashboard")
        throw new ServerError(403, "Insufficient permissions");

    let users = await getAllUsers();
    respond(res, 200, users);
}

export async function post(req: express.Request, res: express.Response) {
    if (!req.body.email || !req.body.username || !req.body.password)
        throw new ServerError(400, "Invalid arguments");

    let user_info = {};
    for (const key in req.body) {
        if (configReader.config.user_info.hasOwnProperty(key))
            user_info[key] = req.body[key];
    }
    let user = await User.create(req.body.username, req.body.email, req.body.password, user_info);
    await user.save();
    let token = await Token.create(user, await Client.fromId(Database.dashboard_id));
    let { token: refresh_token } = await token.createRefreshToken();
    let { token: access_token, expires } = await token.createAccessToken();
    respond(res, 201, { user_id: user.user_id, access_token, refresh_token, expires });
}

export async function put(req: express.Request, res: express.Response) {
    if (!req.user || req.client!.name !== "Dashboard" || req.body.length === 0)
        throw new ServerError(400, "Invalid arguments");

    let user: User;
    if (req.body.user_id && req.body.user_id !== req.user.user_id && !req.user.admin)
        throw new ServerError(403, "Insufficient permissions");
    else if (req.body.user_id && req.body.user_id !== req.user.user_id && req.user.admin)
        user = await User.fromLogin(req.body.user_id);
    else
        user = req.user;

    for (const key in req.body) {
        if (configReader.config.user_info.hasOwnProperty(key))
            user.user_info[key] = req.body[key];
    }

    if (req.body.username) user.username = req.body.username;
    if (req.body.password) user.password = req.body.password;
    if (req.body.email) user.email = req.body.email;
    if (req.body.verified && req.user.admin) user.verified = req.body.verified === true || req.body.verified === "true";
    await user.save();
    respond(res, 200);
}

export async function del(req: express.Request, res: express.Response) {
    if (!req.user || req.client!.name !== "Dashboard")
        throw new ServerError(400, "Invalid arguments");

    let user: User;
    if (req.body.user_id !== undefined && req.body.user_id !== req.user.user_id && !req.user.admin)
        throw new ServerError(403, "Insufficient permissions");
    else if (req.body.user_id !== req.user.user_id && req.user.admin)
        user = await User.fromLogin(req.body.user_id);
    else
        user = req.user;

    await user.delete();
    respond(res, 200);
}
