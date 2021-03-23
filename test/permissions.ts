import assert from 'assert';
import { v4 as uuidv4 } from 'uuid';
import { setup, cleanup, clean, insertTestData, testUser, testClient } from './test-utils';
import { Database } from '../src/db/db';
import { ClientTuple, PermissionsTuple } from '../src/db/schemas';
import { Permissions } from '../src/api/services/Permissions';

let testPermission: PermissionsTuple = {
    user_id: testUser.user_id,
    client_id: testClient.client_id,
    permission: 'testPerm'
};

let clientTuple: ClientTuple = {
    client_id: uuidv4(),
    name: 'AdminTestClient',
    client_secret: '1234',
    dev_id: uuidv4()
}

describe("Permissions", () => {
    before(setup);
    after(cleanup);
    afterEach(clean);

    describe("fromUserId", () => {
        it("should load no permissions if the user doesn't exist", async () => {
            let permissions = await Permissions.fromUserId(uuidv4());
            assert.strictEqual(Object.keys(permissions.values).length, 0);
        });

        it("should load no permissions if the user doesn't have permissions", async () => {
            await insertTestData();
            let permissions = await Permissions.fromUserId(testUser.user_id);
            assert.strictEqual(Object.keys(permissions.values).length, 0);
        });

        it("should load user permissions", async () => {
            await insertTestData();
            await Database.insert('permissions', testPermission);
            let permissions = await Permissions.fromUserId(testUser.user_id);
            assert.deepStrictEqual(permissions.values[testClient.client_id], [ 'testPerm' ]);
        });
    });

    describe("adminOf", () => {
        it("should return true if the user is a dashboard admin", async () => {
            await insertTestData();
            await Database.insert('client', clientTuple);
            await Database.insert('permissions', { user_id: testUser.user_id, client_id: Database.dashboard_id, permission: 'admin' });
            let permissions = await Permissions.fromUserId(testUser.user_id);
            assert.strictEqual(await permissions.adminOf(clientTuple.client_id), true);
        });

        it("should return true if the user is a client admin", async () => {
            await insertTestData();
            await Database.insert('client', clientTuple);
            await Database.insert('permissions', { user_id: testUser.user_id, client_id: clientTuple.client_id, permission: 'admin' });
            let permissions = await Permissions.fromUserId(testUser.user_id);
            assert.strictEqual(await permissions.adminOf(clientTuple.client_id), true);
        });

        it("should return true if the user is the client owner", async () => {
            await insertTestData();
            let permissions = await Permissions.fromUserId(testUser.user_id);
            assert.strictEqual(await permissions.adminOf(testClient.client_id), true);
        });

        it("should return false if the user is not an admin", async () => {
            await insertTestData();
            await Database.insert('client', clientTuple);
            let permissions = await Permissions.fromUserId(testUser.user_id);
            assert.strictEqual(await permissions.adminOf(clientTuple.client_id), false);
        });
    });

    describe("has", () => {
        it("sould return false if the permission doesn't exist", async () => {
            let permissions = await Permissions.fromUserId(testUser.user_id);
            assert.strictEqual(permissions.has(testPermission.client_id, testPermission.permission), false);
        });

        it("should return true if the permission exists", async () => {
            await Database.insert('permissions', testPermission);
            let permissions = await Permissions.fromUserId(testUser.user_id);
            assert.strictEqual(permissions.has(testPermission.client_id, testPermission.permission), true);
        });
    });

    describe("add", () => {
        it("should add a permission if it didn't exist before", async () => {
            let permissions = await Permissions.fromUserId(testUser.user_id);
            permissions.add(testClient.client_id, testPermission.permission);
            assert.deepStrictEqual(permissions.values, { [testClient.client_id]: [ testPermission.permission ] });
        });

        it("should add a permission if it didn't exist before and the client has an other permission", async () => {
            let permissions = await Permissions.fromUserId(testUser.user_id);
            permissions.add(testClient.client_id, 'testPerm1');
            permissions.add(testClient.client_id, 'testPerm2');
            assert.deepStrictEqual(permissions.values, { [testClient.client_id]: [ 'testPerm1', 'testPerm2' ] });
        });

        it("should change nothing if the permission existed before", async () => {
            await Database.insert('permissions', testPermission);
            let permissions = await Permissions.fromUserId(testUser.user_id);
            permissions.add(testClient.client_id, testPermission.permission);
            assert.deepStrictEqual(permissions.values, { [testClient.client_id]: [ testPermission.permission ] });
        });
    });

    describe("del", () => {
        it("should remove the permission", async () => {
            await Database.insert('permissions', testPermission);
            let permissions = await Permissions.fromUserId(testUser.user_id);
            permissions.del(testPermission.client_id, testPermission.permission);
            assert.strictEqual(permissions.values[testPermission.client_id].length, 0);
        });

        it("should do nothing if the permission doesn't exist", async () => {
            await Database.insert('permissions', testPermission);
            let permissions = await Permissions.fromUserId(testUser.user_id);
            permissions.del(testPermission.client_id, 'notExisting');
            assert.deepStrictEqual(permissions.values[testPermission.client_id], [ testPermission.permission ]);
        });
    });

    describe("save", () => {
        it("should save added permissions to the database", async () => {
            let permissions = await Permissions.fromUserId(testUser.user_id);
            permissions.add(testPermission.client_id, testPermission.permission);
            await permissions.save();
            assert.deepStrictEqual(await Database.select('permissions'), testPermission);
        });

        it("should remove deleted permissions from the database", async () => {
            await Database.insert('permissions', testPermission);
            let permissions = await Permissions.fromUserId(testUser.user_id);
            permissions.del(testPermission.client_id, testPermission.permission);
            await permissions.save();
            assert.strictEqual(await Database.select('permissions'), undefined);
        });
    });

    describe("export", () => {
        it("should return an empty array if there are no permissions for the client", async () => {
            let permissions = await Permissions.fromUserId(testPermission.user_id);
            assert.deepStrictEqual(permissions.export(testPermission.client_id), []);
        });

        it("should return the permissions", async () => {
            await Database.insert('permissions', testPermission);
            let permissions = await Permissions.fromUserId(testPermission.user_id);
            assert.deepStrictEqual(permissions.export(testPermission.client_id), [ testPermission.permission ]);
        });
    });
});
