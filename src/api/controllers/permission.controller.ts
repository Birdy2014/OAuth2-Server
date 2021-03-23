import express from 'express';
import { Permissions } from '../services/Permissions';
import { respond, ServerError } from '../utils';

export async function get(req: express.Request, res: express.Response) {
    if (req.client!.name !== "Dashboard")
        throw new ServerError(400, "Invalid arguments");

    const admin = await req.user!.permissions.adminOf(req.body.client_id);

    //Only Admin or the user
    if (!admin && req.body.user_id)
        throw new ServerError(403, "Insufficient permissions");

    let permissions = req.body.user_id ? await Permissions.fromUserId(req.body.user_id) : req.user!.permissions;

    //Get permissions
    respond(res, 200, permissions.export(req.query.client_id as string));
}

export async function post(req: express.Request, res: express.Response) {
    if (req.client!.name !== "Dashboard" || !req.body.client_id || !req.body.permission)
        throw new ServerError(400, "Invalid arguments");

    const admin = await req.user!.permissions.adminOf(req.body.client_id);

    //Only Admin
    if (!admin)
        throw new ServerError(403, "Insufficient permissions");

    let permissions = req.body.user_id ? await Permissions.fromUserId(req.body.user_id) : req.user!.permissions;

    //Add permission
    permissions.add(req.body.client_id, req.body.permission);
    await permissions.save();
    respond(res, 201);
}

export async function del(req: express.Request, res: express.Response) {
    if (req.client!.name !== "Dashboard" || !req.body.permission || !req.body.client_id)
        throw new ServerError(400, "Invalid arguments");

    const admin = await req.user!.permissions.adminOf(req.body.client_id);

    //Only Admin or the user
    if (!admin && req.body.user_id)
        throw new ServerError(403, "Insufficient permissions");

    let permissions = req.body.user_id ? await Permissions.fromUserId(req.body.user_id) : req.user!.permissions;

    //Delete permission
    permissions.del(req.body.client_id, req.body.permission);
    await permissions.save();
    respond(res, 200);
}
