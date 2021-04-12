import { setup, cleanup, clean, testClient, testUser, shouldFail, insertTestData } from './test-utils';
import assert from 'assert';
import { User } from '../src/api/services/User';
import { UserTuple, UserInfoTuple, VerificationCodeTuple } from '../src/db/schemas';
import { Database } from '../src/db/Database';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

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
            assert.strictEqual(user.verified, testUser.verified);
            assert.strictEqual(user.user_info, testUser.user_info);
        });
    });

    describe("fromLogin", () => {
        beforeEach(insertTestData);

        it("should work with a valid user_id", async () => {
            let user = await User.fromLogin(testUser.user_id);

            assert.strictEqual(user.email, testUser.email);
            assert.strictEqual(user.username, testUser.username);
            assert.strictEqual(user.verified, testUser.verified);
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
            assert.strictEqual(user.verified, testUser.verified);
            assert.deepStrictEqual(user.user_info, testUser.user_info);
        });

        it("should fail with an invalid email address", async () => {
            await shouldFail(User.fromLogin, [testUser.email + "a"], "ServerError", `User ${testUser.email}a not found`);
        });

        it("should work with a valid username", async () => {
            let user = await User.fromLogin(testUser.username);

            assert.strictEqual(user.email, testUser.email);
            assert.strictEqual(user.username, testUser.username);
            assert.strictEqual(user.verified, testUser.verified);
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
            assert.strictEqual(user.verified, testUser.verified);
            assert.deepStrictEqual(user.user_info, testUser.user_info);
        });

        it("should fail with an invalid password", async () => {
            await shouldFail(User.fromLoginPassword, [testUser.user_id, testUser.password + "a"], "ServerError", "Invalid user credentials");
        });
    });

    describe("fromVerificationCode", () => {
        beforeEach(async () => {
            await Database.insert('user', { user_id: testUser.user_id, username: testUser.username, email: testUser.email, password_hash: await bcrypt.hash(testUser.password, 12), verified: false });
        });

        it("should get the user and set the verified variable with a valid verification code", async () => {
            const tuple: VerificationCodeTuple = {
                user_id: testUser.user_id,
                verification_code: "code",
                change_password: false
            }
            await Database.insert('verification_code', tuple);
            let user = await User.fromVerificationCode(tuple.verification_code);
            assert.strictEqual(user.user_id, tuple.user_id);
            assert.strictEqual(user.verified, true);
            assert.strictEqual(user.email, testUser.email);
        });

        it("should change the email address", async () => {
            const tuple: VerificationCodeTuple = {
                user_id: testUser.user_id,
                email: "changed@example.com",
                verification_code: "code",
                change_password: false
            }
            await Database.insert('verification_code', tuple);
            let user = await User.fromVerificationCode(tuple.verification_code);
            assert.strictEqual(user.user_id, tuple.user_id);
            assert.strictEqual(user.verified, true);
            assert.strictEqual(user.email, tuple.email);
        });

        it("should change the password if set", async () => {
            const tuple: VerificationCodeTuple = {
                user_id: testUser.user_id,
                verification_code: "code",
                change_password: true
            }
            await Database.insert('verification_code', tuple);
            let user = await User.fromVerificationCode(tuple.verification_code, "changedPassword");
            await user.save();
            let result = await Database.select<UserTuple>('user', { user_id: tuple.user_id });
            assert.notStrictEqual(result, undefined);
            assert.strictEqual(bcrypt.compareSync("changedPassword", result!.password_hash), true);
        });

        it("should not change the password if not set", async () => {
            const tuple: VerificationCodeTuple = {
                user_id: testUser.user_id,
                verification_code: "code",
                change_password: false
            }
            await Database.insert('verification_code', tuple);
            let user = await User.fromVerificationCode(tuple.verification_code, "changedPassword");
            assert.strictEqual(user.password, undefined);
        });

        it("should fail with an invalid verification code", async () => {
            await shouldFail(User.fromVerificationCode, ["invalidCode"], "ServerError", "Invalid verification_code");
        });
    });

    describe("save", () => {
        it("should save the user data", async () => {
            let user = await User.create(testUser.username, testUser.email, testUser.password, testUser.user_info);
            await user.save();

            let userData: UserTuple|undefined = await Database.select<UserTuple>('user', { user_id: user.user_id });
            let userInfo: UserInfoTuple[] = await Database.selectAll<UserInfoTuple>('user_info', { user_id: user.user_id });

            assert.strictEqual(userData?.email, testUser.email);
            assert.strictEqual(userData?.username, testUser.username);
            assert.strictEqual(userData.verified, testUser.verified);

            assert.strictEqual(userInfo.length, Object.getOwnPropertyNames(testUser.user_info).length);
            for (let tuple of userInfo) {
                assert.strictEqual(tuple.value, testUser.user_info[tuple.name]);
            }
        });

        it("should change user_info", async () => {
            let user = await User.create(testUser.username, testUser.email, testUser.password, { key1: "value" });
            await user.save();
            user.user_info.key1 = "abcd";
            user.user_info.key2 = "efgh";
            await user.save();

            let userInfo: UserInfoTuple[] = await Database.selectAll<UserInfoTuple>('user_info', { user_id: user.user_id });

            let stored: any = {};
            for (let tuple of userInfo) {
                stored[tuple.name] = tuple.value;
            }

            assert.deepStrictEqual(stored, { key1: "abcd", key2: "efgh" });
        });

        it("should change nothing", async () => {
            let user = await User.create(testUser.username, testUser.email, testUser.password, testUser.user_info);
            await user.save();
            await user.save();

            let userData: UserTuple|undefined = await Database.select<UserTuple>('user', { user_id: user.user_id });
            let userInfo: UserInfoTuple[] = await Database.selectAll<UserInfoTuple>('user_info', { user_id: user.user_id });

            assert.strictEqual(userData?.email, testUser.email);
            assert.strictEqual(userData?.username, testUser.username);
            assert.strictEqual(userData.verified, testUser.verified);

            assert.strictEqual(userInfo.length, Object.getOwnPropertyNames(testUser.user_info).length);
            for (let tuple of userInfo) {
                assert.strictEqual(tuple.value, testUser.user_info[tuple.name]);
            }
        });

        it("should fail when the user already exists", async () => {
            Database.insert('user', { user_id: uuidv4(), username: testUser.username, email: testUser.email, password_hash: await bcrypt.hash(testUser.password, 12) });
            let user = await User.create(testUser.username, testUser.email, testUser.password, testUser.user_info);
            await shouldFail(user.save.bind(user), [], 'ServerError', 'User already exists');
        });
    });

    describe("delete", () => {
        beforeEach(insertTestData);

        it("should work", async () => {
            let user = await User.fromLogin(testUser.user_id);
            await user.delete();
            let row = await Database.select<UserTuple>('user', { user_id: testUser.user_id });
            assert.strictEqual(row, undefined);
        });
    });

    describe("export", () => {
        beforeEach(insertTestData);

        it("should work", async () => {
            let user = await User.fromLogin(testUser.user_id);
            let exported = user.export(testClient.client_id);

            assert.strictEqual(exported.user_id, testUser.user_id);
            assert.strictEqual(exported.username, testUser.username);
            assert.strictEqual(exported.email, testUser.email);
            assert.strictEqual(exported.verified, testUser.verified);
            assert.strictEqual(exported.key, testUser.user_info.key);
            // TODO: check permissions
        });
    });
});
