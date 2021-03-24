import { Router } from 'express';
import { wrapRoute } from './utils';
import { isLoggedIn } from '../middleware/isLoggedIn';
import * as authorization from './controllers/authorization.controller';
import * as client from './controllers/client.controller';
import * as uri from './controllers/uri.controller';
import * as permission from './controllers/permission.controller';
import * as token from './controllers/token.controller';
import * as user from './controllers/user.controller';
import verification from './controllers/verification.controller';

export const router = Router();

router.route("/authorize")
    .post(wrapRoute(authorization.post));

router.route("/client")
    .get(isLoggedIn, wrapRoute(client.get))
    .post(isLoggedIn, wrapRoute(client.post))
    .delete(isLoggedIn, wrapRoute(client.del));

router.route("/client/uri")
    .post(isLoggedIn, wrapRoute(uri.post))
    .delete(isLoggedIn, wrapRoute(uri.del));

router.route("/permissions")
    .get(isLoggedIn, wrapRoute(permission.get))
    .post(isLoggedIn, wrapRoute(permission.post))
    .delete(isLoggedIn, wrapRoute(permission.del));

router.route("/token")
    .post(wrapRoute(token.token))
    .delete(wrapRoute(token.revoke));

router.route("/token_info")
    .post(wrapRoute(token.tokenInfo));

router.route("/user")
    .get(isLoggedIn, wrapRoute(user.get))
    .post(wrapRoute(user.post))
    .put(wrapRoute(user.put))
    .delete(wrapRoute(user.del));

router.route("/verification")
    .post(wrapRoute(verification.post))
    .put(wrapRoute(verification.put));
