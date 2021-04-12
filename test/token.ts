import { setup, cleanup, clean, insertTestData } from './test-utils';
import assert from 'assert';
import { Token } from '../src/api/services/Token';
import { Database } from '../src/db/Database';
import { currentUnixTime } from '../src/api/utils';
import { shouldFail, testUser, testClient } from './test-utils';
import { User } from '../src/api/services/User';
import { Client } from '../src/api/services/Client';

describe("Token", () => {
    before(setup);
    after(cleanup);
    afterEach(clean);
    beforeEach(insertTestData);

    describe("create", () => {
        it("should work", async () => {
            let user = await User.fromLogin(testUser.user_id);
            let client = await Client.fromId(testClient.client_id);
            let token = await Token.create(user, client);
            assert.deepStrictEqual(token.user, user);
            assert.deepStrictEqual(token.client, client);
        });
    });

    describe("fromAccessToken", () => {
        it("should work with a valid access_token", async () => {
            await Database.insert('access_token', { user_id: testUser.user_id, client_id: testClient.client_id, access_token: "token", expires: currentUnixTime() + 200 });
            let token = await Token.fromAccessToken("token");
            let user = token.user;
            let client = token.client;

            assert.strictEqual(user.email, testUser.email);
            assert.strictEqual(user.username, testUser.username);
            assert.strictEqual(user.verified, testUser.verified);
            assert.deepStrictEqual(user.user_info, testUser.user_info);

            assert.strictEqual(client.client_secret, testClient.client_secret);
            assert.strictEqual(client.name, testClient.name);
            assert.deepStrictEqual(client.redirect_uris, testClient.redirect_uris);
        });

        it("should fail with an invalid access_token", async () => {
            await Database.insert('access_token', { user_id: testUser.user_id, client_id: testClient.client_id, access_token: "token", expires: currentUnixTime() + 200 });
            await shouldFail(Token.fromAccessToken, ["token123"], "ServerError", "Invalid access_token");
        });

        it("should fail with an expired access_token", async () => {
            await Database.insert('access_token', { user_id: testUser.user_id, client_id: testClient.client_id, access_token: "token", expires: currentUnixTime() - 200 });
            await shouldFail(Token.fromAccessToken, ["token"], "ServerError", "Invalid access_token");
        });
    });

    describe("fromRefreshToken", () => {
        it("should work with a valid refresh_token", async () => {
            await Database.insert('refresh_token', { user_id: testUser.user_id, client_id: testClient.client_id, refresh_token: "token", expires: currentUnixTime() + 200 });
            let token = await Token.fromRefreshToken("token");
            let user = token.user;
            let client = token.client;

            assert.strictEqual(user.email, testUser.email);
            assert.strictEqual(user.username, testUser.username);
            assert.strictEqual(user.verified, testUser.verified);
            assert.deepStrictEqual(user.user_info, testUser.user_info);

            assert.strictEqual(client.client_secret, testClient.client_secret);
            assert.strictEqual(client.name, testClient.name);
            assert.deepStrictEqual(client.redirect_uris, testClient.redirect_uris);
        });

        it("should fail with an invalid refresh_token", async () => {
            await Database.insert('refresh_token', { user_id: testUser.user_id, client_id: testClient.client_id, refresh_token: "token", expires: currentUnixTime() + 200 });
            await shouldFail(Token.fromRefreshToken, ["token123"], "ServerError", "Invalid refresh_token");
        });

        it("should fail with an expired refresh_token", async () => {
            await Database.insert('refresh_token', { user_id: testUser.user_id, client_id: testClient.client_id, refresh_token: "token", expires: currentUnixTime() - 200 });
            await shouldFail(Token.fromRefreshToken, ["token"], "ServerError", "Invalid refresh_token");
        });
    });

    describe("fromAuthorizationCode", () => {
        it("should work with a correct authorization_code and code_verifier", async () => {
            await Database.insert('authorization_code', { user_id: testUser.user_id, client_id: testClient.client_id, authorization_code: "token", expires: currentUnixTime() + 200, challenge: testUser.challenge });
            let token = await Token.fromAuthorizationCode("token", testUser.code_verifier)
            let user = token.user;
            let client = token.client;

            assert.strictEqual(user.email, testUser.email);
            assert.strictEqual(user.username, testUser.username);
            assert.strictEqual(user.verified, testUser.verified);
            assert.deepStrictEqual(user.user_info, testUser.user_info);

            assert.strictEqual(client.client_secret, testClient.client_secret);
            assert.strictEqual(client.name, testClient.name);
            assert.deepStrictEqual(client.redirect_uris, testClient.redirect_uris);
        });

        it("should remove the authorization_code from the Database", async () => {
            await Database.insert('authorization_code', { user_id: testUser.user_id, client_id: testClient.client_id, authorization_code: "token", expires: currentUnixTime() + 200, challenge: testUser.challenge });
            await Token.fromAuthorizationCode("token", testUser.code_verifier)

            let row = await Database.select('authorization_code', { authorization_code: "token" });
            assert.strictEqual(row, undefined);
        });

        it("should fail with an expired authorization_code", async () => {
            await Database.insert('authorization_code', { user_id: testUser.user_id, client_id: testClient.client_id, authorization_code: "token", expires: currentUnixTime() - 200, challenge: testUser.challenge });
            await shouldFail(Token.fromAuthorizationCode, ["token", testUser.code_verifier], "ServerError", "Invalid authorization_code");

        });

        it("should fail with an incorrect authorization_code", async () => {
            await Database.insert('authorization_code', { user_id: testUser.user_id, client_id: testClient.client_id, authorization_code: "token", expires: currentUnixTime() + 200, challenge: testUser.challenge });
            await shouldFail(Token.fromAuthorizationCode, ["a", testUser.code_verifier], "ServerError", "Invalid authorization_code");
        });

        it("should fail with an incorrect code verifier", async () => {
            await Database.insert('authorization_code', { user_id: testUser.user_id, client_id: testClient.client_id, authorization_code: "token", expires: currentUnixTime() + 200, challenge: testUser.challenge });
            await shouldFail(Token.fromAuthorizationCode, ["token", "a"], "ServerError", "Invalid code_verifier");
        });
    });

    describe("createAccessToken", () => {
        it("should work", async () => {
            let token = await Token.create(await User.fromLogin(testUser.user_id), await Client.fromId(testClient.client_id));
            let { token: access_token, expires } = await token.createAccessToken();
            let token_row = await Database.select('access_token', { access_token });
            assert.deepStrictEqual(token_row, { access_token, user_id: testUser.user_id, client_id: testClient.client_id, expires });
        });
    });

    describe("createRefreshToken", () => {
        it("should work", async () => {
            let token = await Token.create(await User.fromLogin(testUser.user_id), await Client.fromId(testClient.client_id));
            let { token: refresh_token, expires } = await token.createRefreshToken();
            let token_row = await Database.select('refresh_token', { refresh_token });
            assert.deepStrictEqual(token_row, { refresh_token, user_id: testUser.user_id, client_id: testClient.client_id, expires });
        });
    });

    describe("createAuthorizationCode", () => {
        it("should work", async () => {
            let token = await Token.create(await User.fromLogin(testUser.user_id), await Client.fromId(testClient.client_id));
            let { token: authorization_code, expires } = await token.createAuthorizationCode(testUser.challenge);
            let token_row = await Database.select('authorization_code', { authorization_code });
            assert.deepStrictEqual(token_row, { authorization_code, user_id: testUser.user_id, client_id: testClient.client_id, expires, challenge: testUser.challenge });
        });

        it("should fail with an empty challenge", async () => {
            let token = await Token.create(await User.fromLogin(testUser.user_id), await Client.fromId(testClient.client_id));
            await shouldFail(token.createAuthorizationCode.bind(token), [""], "ServerError", "Invalid challenge");
        });
    });
});
