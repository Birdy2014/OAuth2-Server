import Express from 'express-serve-static-core';
import { User } from './api/services/User';
import { Client } from './api/services/Client';
import { Token } from './api/services/Token';

declare global {
    namespace Express {
        export interface Request {
            token?: Token;
            user?: User;
            client?: Client;
        }
    }
}
