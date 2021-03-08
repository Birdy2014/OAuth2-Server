import { setup, cleanup } from './test-utils';
import crypto from 'crypto';
import { Database } from '../src/db/db';
import authorization from '../src/api/services/authorization.service';
import assert from 'assert';

const testUser = {
    user_id: "e1b53f7e-027a-4c0d-81bc-c4c8de75c9ef",
    email: "test@example.com",
    username: "Test",
    password_hash: "password",
    code_verifier: "1234",
    challenge: "",
    authorization_code: ""
}

describe("authorization", () => {
    before(async () => {
        await setup();
        Database.insert("user", { user_id: testUser.user_id, email: testUser.email, username: testUser.username, password_hash: testUser.password_hash });
        testUser.challenge = crypto.createHash("sha256").update(testUser.code_verifier).digest("base64").replace(/\+/g, "_");
    });

    after(cleanup);

    describe("createAuthorizationCode", () => {
        it("should create an authorization code", async () => {
            let authorization_code = await authorization.createAuthorizationCode(Database.dashboard_id, testUser.user_id, testUser.challenge);
            testUser.authorization_code = authorization_code;
        });
    });

    describe("checkPKCE", () => {
        it("should be successful when correct code verifier is used", async () => {
            let success = await authorization.checkPKCE(testUser.authorization_code, testUser.code_verifier)
            if (!success)
                assert.fail("Success is false");
        });

        it("should fail when incorrect code verifier is used", async () => {
            let success = await authorization.checkPKCE(testUser.authorization_code, "a");
            if (success)
                assert.fail("Success is true");
        });
    });
});
