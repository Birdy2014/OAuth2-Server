import { ConfigReader } from '../src/ConfigReader';
ConfigReader.load(__dirname + "/config");
import { Logger } from '../src/Logger';
import { Database } from '../src/db/Database';
import { AssertionError, fail } from 'assert';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

export async function setup() {
    Logger.init(ConfigReader.config.logpath);
    await Database.init(ConfigReader.config.url);
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
    Database.close();
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

const testUser = {
    user_id: uuidv4(),
    email: "test@example.com",
    username: "Test",
    password: "password",
    verified: true,
    user_info: {
        key: "value"
    },
    code_verifier: "1234",
    challenge: "A6xnQhbz4Vx2HuGl4lXwZ5U2I8iziLRFnhP5eNfIRvQ=",
}

const testClient = {
    client_id: uuidv4(),
    client_secret: "secretpassword",
    name: "TestClient",
    dev_id: testUser.user_id,
    redirect_uris: [
        "test.example.com",
        "test2.example.com"
    ]
}

export { testUser, testClient };

export async function insertTestData() {
    await Database.insert('user', { user_id: testUser.user_id, username: testUser.username, email: testUser.email, password_hash: await bcrypt.hash(testUser.password, 12), verified: testUser.verified });
    await Database.insert('user_info', { user_id: testUser.user_id, name: "key", value: "value" });
    await Database.insert('client', { client_id: testClient.client_id, client_secret: testClient.client_secret, name: testClient.name, dev_id: testClient.dev_id });
    for (const uri of testClient.redirect_uris)
        await Database.insert('redirect_uri', { client_id: testClient.client_id, redirect_uri: uri });
}
