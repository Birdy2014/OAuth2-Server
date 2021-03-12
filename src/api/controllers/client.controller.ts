import express from 'express';
import client from '../services/client.service';
import { Client } from '../services/Client';
import { respond, ServerError } from '../utils';

export async function get(req: express.Request, res: express.Response) {
    if (!req.user!.admin || req.client!.name !== "Dashboard")
        throw new ServerError(403, "Insufficient permissions");

    let clients = await client.getClients();
    respond(res, 200, clients);
}

export async function post(req: express.Request, res: express.Response) {
    if (!req.body.name || !req.body.redirect_uri || req.client!.name !== "Dashboard")
        throw new ServerError(400, "Invalid arguments");

    let client = await Client.create(req.body.name, req.user!.user_id, req.body.redirect_uri);
    await client.save();
    respond(res, 201, { client_id: client.client_id, client_secret: client.client_secret });
}

export async function del(req: express.Request, res: express.Response) {
    if (!req.body.client_id || req.client!.name !== "Dashboard")
        throw new ServerError(400, "Invalid arguments");

    let client = await Client.fromId(req.body.client_id);
    if (!req.user!.admin && req.user!.user_id !== client.dev_id)
        throw new ServerError(403, "Insufficient permissions");
    await client.delete();
    respond(res, 200);
}
