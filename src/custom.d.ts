import Express from 'express-serve-static-core';
import { User } from './api/services/User';
import { Client } from './api/services/Client';

declare global {
    namespace Express {
        export interface Request {
            user?: User;
            client?: Client;
        }
    }
}
