import express from 'express';
import { respond, ServerError } from '../utils';
import { Client } from '../services/Client';

export async function post(req: express.Request, res: express.Response) {
    if (!req.body.client_id || !req.body.redirect_uri || req.client!.name !== "Dashboard")
        throw new ServerError(400, "Invalid arguments");

    //Only Admin
    if (!await req.user!.permissions.adminOf(req.body.client_id))
        throw new ServerError(403, "Insufficient permissions");

    let client = await Client.fromId(req.body.client_id);
    client.redirect_uris.push(req.body.redirect_uri);
    await client.save();
    respond(res, 201);
}

export async function del(req: express.Request, res: express.Response)  {
    if (!req.body.client_id || !req.body.redirect_uri || req.client!.name !== "Dashboard")
        throw new ServerError(400, "Invalid arguments");

    //Only Admin
    if (!await req.user!.permissions.adminOf(req.body.client_id))
        throw new ServerError(403, "Insufficient permissions");

    let client = await Client.fromId(req.body.client_id);
    client.removeUri(req.body.redirect_uri);
    await client.save();
    respond(res, 200);
}
