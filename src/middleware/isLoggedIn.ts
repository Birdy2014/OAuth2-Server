import express from 'express';
import { ServerError } from '../api/utils';

//call next only if the user is logged in using the access_token
export function isLoggedIn(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (req.user !== undefined)
        next();
    else
        throw new ServerError(403, "Unauthorized");
}
