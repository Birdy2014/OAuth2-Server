import { setup, cleanup, clean, testClient, shouldFail, insertTestData } from './test-utils';
import assert from 'assert';
import { v4 as uuidv4 } from 'uuid';
import { Client } from '../src/api/services/Client';
import { ClientTuple, RedirectUriTuple } from '../src/db/schemas';
import { Database } from '../src/db/db';

describe("Client", () => {
    before(setup);
    after(cleanup);
    afterEach(clean);

    describe("create", () => {
        it("should work if the client doesn't exist", async () => {
            const uuidRegEx = /\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b/;

            let client = await Client.create(testClient.name, testClient.dev_id, testClient.redirect_uris[0]);
            assert.strictEqual(client.name, testClient.name);
            assert.strictEqual(client.dev_id, testClient.dev_id);
            assert.strictEqual(client.redirect_uris.length, 1);
            assert.strictEqual(client.redirect_uris[0], testClient.redirect_uris[0]);
            assert.match(client.client_id, uuidRegEx);
        });
    });

    describe("fromId", () => {
        beforeEach(insertTestData);

        it("should work if the client exists", async () => {
            let client = await Client.fromId(testClient.client_id);
            assert.strictEqual(client.client_id, testClient.client_id);
            assert.strictEqual(client.name, testClient.name);
            assert.strictEqual(client.dev_id, testClient.dev_id);
            assert.deepStrictEqual(client.redirect_uris, testClient.redirect_uris);
        });

        it("should fail if the client doesn't exist", async () => {
            let invalidUuid = uuidv4();
            await shouldFail(Client.fromId, [ invalidUuid ], 'ServerError', `Client ${invalidUuid} not found`);
        });
    });

    describe("fromName", () => {
        beforeEach(insertTestData);

        it("should work if the client exists", async () => {
            let client = await Client.fromName(testClient.name);
            assert.strictEqual(client.client_id, testClient.client_id);
            assert.strictEqual(client.name, testClient.name);
            assert.strictEqual(client.dev_id, testClient.dev_id);
            assert.deepStrictEqual(client.redirect_uris, testClient.redirect_uris);
        });

        it("should fail if the client doesn't exist", async () => {
            let invalidName = testClient.name + 'a';
            await shouldFail(Client.fromName, [ invalidName ], 'ServerError', `Client ${invalidName} not found`);
        });
    });

    describe("fromIdUri", () => {
        beforeEach(insertTestData);

        it("should work if the client exists", async () => {
            let client = await Client.fromIdUri(testClient.client_id, testClient.redirect_uris[0]);
            assert.strictEqual(client.client_id, testClient.client_id);
            assert.strictEqual(client.name, testClient.name);
            assert.strictEqual(client.dev_id, testClient.dev_id);
            assert.deepStrictEqual(client.redirect_uris, testClient.redirect_uris);

            client = await Client.fromIdUri(testClient.client_id, testClient.redirect_uris[1]);
            assert.strictEqual(client.client_id, testClient.client_id);
            assert.strictEqual(client.name, testClient.name);
            assert.strictEqual(client.dev_id, testClient.dev_id);
            assert.deepStrictEqual(client.redirect_uris, testClient.redirect_uris);
        });

        it("should fail if the client doesn't exist", async () => {
            let invalidId = uuidv4();
            await shouldFail(Client.fromIdUri, [ invalidId, testClient.redirect_uris[0] ], 'ServerError', `Client ${invalidId} not found`);
        });

        it("should fail if the uri is invalid", async () => {
            let invalidUri = 'invalid.uri';
            await shouldFail(Client.fromIdUri, [ testClient.client_id, invalidUri ], 'ServerError', 'Invalid redirect_uri');
        });
    });

    describe("save", () => {
        it("should save a new client", async () => {
            // @ts-expect-error
            let client = new Client(testClient.client_id, testClient.client_secret, testClient.name, testClient.dev_id, testClient.redirect_uris, true);
            await client.save();

            let client_tuple: ClientTuple|undefined = await Database.select('client', `client_id = '${testClient.client_id}'`);
            let redirect_uri_tuples: RedirectUriTuple[] = await Database.selectAll('redirect_uri', `client_id = '${testClient.client_id}'`);

            assert.strictEqual(client_tuple?.client_id, testClient.client_id);
            assert.strictEqual(client_tuple?.client_secret, testClient.client_secret);
            assert.strictEqual(client_tuple?.name, testClient.name);
            assert.strictEqual(client_tuple?.dev_id, testClient.dev_id);

            let redirect_uris: string[] = [];
            for (const tuple of redirect_uri_tuples)
                redirect_uris.push(tuple.redirect_uri);

            assert.deepStrictEqual(redirect_uris, testClient.redirect_uris);
        });

        it("should update an existing client", async () => {
            await insertTestData();

            let newName = testClient.name + 'a';
            let newUris = [...testClient.redirect_uris];
            newUris = newUris.filter(uri => uri != testClient.redirect_uris[0]);
            newUris.push('new.uri');

            // @ts-expect-error
            let client = new Client(testClient.client_id, testClient.client_secret, testClient.name, testClient.dev_id, testClient.redirect_uris, false);
            client.name = newName;
            client.removeUri(testClient.redirect_uris[0]);
            client.redirect_uris.push('new.uri');
            await client.save();

            let client_tuple: ClientTuple|undefined = await Database.select('client', `client_id = '${testClient.client_id}'`);
            let redirect_uri_tuples: RedirectUriTuple[] = await Database.selectAll('redirect_uri', `client_id = '${testClient.client_id}'`);

            assert.strictEqual(client_tuple?.client_id, testClient.client_id);
            assert.strictEqual(client_tuple?.client_secret, testClient.client_secret);
            assert.strictEqual(client_tuple?.name, newName);
            assert.strictEqual(client_tuple?.dev_id, testClient.dev_id);

            assert.strictEqual(redirect_uri_tuples.length, newUris.length);
            for (const tuple of redirect_uri_tuples) {
                assert.strictEqual(newUris.includes(tuple.redirect_uri), true);
            }
        });

        it("should fail if it tries to create a client that already exists", async () => {
            await insertTestData();

            // @ts-expect-error
            let client = new Client(testClient.client_id, testClient.client_secret, testClient.name, testClient.dev_id, testClient.redirect_uris, true);
            await shouldFail(client.save.bind(client), [], 'ServerError', 'Client already exists');
        });
    });

    describe("delete", () => {
        it("should delete the client", async () => {
            await insertTestData();

            // @ts-expect-error
            let client = new Client(testClient.client_id, testClient.client_secret, testClient.name, testClient.dev_id, testClient.redirect_uris, false);
            await client.delete();

            let client_tuple: ClientTuple|undefined = await Database.select('client', `client_id = '${testClient.client_id}'`);
            let redirect_uri_tuples: RedirectUriTuple[] = await Database.selectAll('redirect_uri', `client_id = '${testClient.client_id}'`);

            assert.strictEqual(client_tuple, undefined);
            assert.strictEqual(redirect_uri_tuples.length, 0);
        });

    });

    describe("removeUri", () => {
        it('should remove the given redirect_uri from the list', async () => {
            let uris = testClient.redirect_uris.filter(val => val != testClient.redirect_uris[0]);

            // @ts-expect-error
            let client = new Client(testClient.client_id, testClient.client_secret, testClient.name, testClient.dev_id, testClient.redirect_uris, true);
            client.removeUri(testClient.redirect_uris[0]);

            assert.deepStrictEqual(client.redirect_uris, uris);
        });
    });
});
