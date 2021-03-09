import { setup, cleanup, clean } from './test-utils';
import assert from 'assert';
import { User } from '../src/api/services/User';
import { UserTuple, UserInfoTuple } from '../src/db/schemas';
import { Database } from '../src/db/db';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { shouldFail, testUser, insertTestData } from './test-utils';

describe("User", () => {
    before(setup);
    after(cleanup);
    afterEach(clean);

    describe("create", () => {
        it("should fail with an invalid email address", async () => {
            await shouldFail(User.create, [testUser.username, "email", testUser.password, testUser.user_info], "ServerError", "Invalid Email Address");
        });

        it("should fail with an invalid password", async () => {
            await shouldFail(User.create, [testUser.username, testUser.email, "passw", testUser.user_info], "ServerError", "Invalid Password");
        });

        it("should create the user when valid arguments are passed", async () => {
            let user = await User.create(testUser.username, testUser.email, testUser.password, testUser.user_info);

            assert.strictEqual(user.email, testUser.email);
            assert.strictEqual(user.username, testUser.username);
            assert.strictEqual(user.user_info, testUser.user_info);
        });
    });

    describe("fromLogin", () => {
        beforeEach(insertTestData);

        it("should work with a valid user_id", async () => {
            let user = await User.fromLogin(testUser.user_id);

            assert.strictEqual(user.email, testUser.email);
            assert.strictEqual(user.username, testUser.username);
            assert.deepStrictEqual(user.user_info, testUser.user_info);
        });

        it("should fail with an invalid user_id", async () => {
            let user_id = uuidv4();
            await shouldFail(User.fromLogin, [user_id], "ServerError", `User ${user_id} not found`);
        });

        it("should work with a valid email address", async () => {
            let user = await User.fromLogin(testUser.email);

            assert.strictEqual(user.email, testUser.email);
            assert.strictEqual(user.username, testUser.username);
            assert.deepStrictEqual(user.user_info, testUser.user_info);
        });

        it("should fail with an invalid email address", async () => {
            await shouldFail(User.fromLogin, [testUser.email + "a"], "ServerError", `User ${testUser.email}a not found`);
        });

        it("should work with a valid username", async () => {
            let user = await User.fromLogin(testUser.username);

            assert.strictEqual(user.email, testUser.email);
            assert.strictEqual(user.username, testUser.username);
            assert.deepStrictEqual(user.user_info, testUser.user_info);
        });

        it("should fail with an invalid username", async () => {
            await shouldFail(User.fromLogin, [testUser.username + "a"], "ServerError", `User ${testUser.username}a not found`);
        });
    });

    describe("fromLoginPassword", () => {
        beforeEach(insertTestData);

        it("should work with a valid password", async () => {
            let user = await User.fromLoginPassword(testUser.user_id, testUser.password);

            assert.strictEqual(user.email, testUser.email);
            assert.strictEqual(user.username, testUser.username);
            assert.deepStrictEqual(user.user_info, testUser.user_info);
        });

        it("should fail with an invalid password", async () => {
            await shouldFail(User.fromLoginPassword, [testUser.user_id, testUser.password + "a"], "ServerError", "Invalid user credentials");
        });
    });

    describe("save", () => {
        it("should save the user data", async () => {
            let user = await User.create(testUser.username, testUser.email, testUser.password, testUser.user_info);
            await user.save();

            let userData: UserTuple|undefined = await Database.select<UserTuple>('user', `user_id = '${user.user_id}'`);
            let userInfo: UserInfoTuple[] = await Database.selectAll<UserInfoTuple>('user_info', `user_id = '${user.user_id}'`);

            assert.strictEqual(userData?.email, testUser.email);
            assert.strictEqual(userData?.username, testUser.username);

            assert.strictEqual(userInfo.length, Object.getOwnPropertyNames(testUser.user_info).length);
            for (let tuple of userInfo) {
                assert.strictEqual(tuple.value, testUser.user_info[tuple.name]);
            }
        });

        it("should fail when the user already exists", async () => {
            Database.insert('user', { user_id: uuidv4(), username: testUser.username, email: testUser.email, password_hash: await bcrypt.hash(testUser.password, 12) });
            let user = await User.create(testUser.username, testUser.email, testUser.password, testUser.user_info);
            shouldFail(user.save, [], 'ServerError', 'User already exists');
        });
    });

    describe("delete", () => {

    });

    describe("export", () => {

    });
});
