import fs from 'fs';
import configReader from '../src/configReader';
configReader.load(__dirname + "/config");
import logger from '../src/logger';
import { Database } from '../src/db/db';
import { AssertionError, fail } from 'assert';

export async function setup() {
    logger.init(configReader.config.logpath);
    await Database.init(configReader.config.db, configReader.config.url);
}

export async function clean() {
    await Database.clearTable("access_token");
    await Database.clearTable("authorization_code");
    await Database.clearTable("client");
    await Database.clearTable("permissions");
    await Database.clearTable("redirect_uri");
    await Database.clearTable("refresh_token");
    await Database.clearTable("user");
    await Database.clearTable("verification_code");
    await Database.clearTable("user_info");
}

export async function cleanup() {
    Database.connection.close();
    fs.unlinkSync(configReader.config.db.path);
}

export function shouldFail(func: Function, args: any[], name?: string, message?: string): Promise<void>|void {
    let result: any;
    try {
        result = func(...args);
    } catch(err) {
        if (name !== undefined && err.name !== name)
            fail(`Expected error with name '${name}', but got '${err.name}' with message '${err.message}'`);
        if (message !== undefined && err.message !== message)
            fail(`Expected error with message '${message}', but got '${err.message}'`);
        return;
    }
    if (result instanceof Promise) {
        return new Promise((resolve, reject) => {
            (result as Promise<unknown>).then(() => reject(new AssertionError({ message: "Function didn't throw error" })))
                .catch((err: Error) => {
                    if (name !== undefined && err.name !== name)
                        reject(new AssertionError({ message: `Expected error with name '${name}', but got '${err.name}' with message '${err.message}'` }));
                    if (message !== undefined && err.message !== message)
                        reject(new AssertionError({ message: `Expected error with message '${message}', but got '${err.message}'` }));
                    resolve();
                });
        });
    } else {
        fail("Function didn't throw error.");
    }
}
