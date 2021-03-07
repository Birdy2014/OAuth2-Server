const { setup, cleanup } = require("./test-utils");
import assert from 'assert';
import { User } from '../src/api/services/User';
import { UserTuple, UserInfoTuple } from '../src/db/schemas';
import { query } from '../src/db/db';
import { ServerError } from '../src/api/utils';

const testUser = {
    user_id: '',
    email: "test@example.com",
    username: "Test",
    password: "password",
    user_info: {
        key: "value"
    }
}

describe("User", () => {
    before((done) => {
        setup(() => done());
    });

    after(() => {
        cleanup();
    });

    describe("create", () => {
        it("should fail with an invalid email address", (done) => {
            User.create(testUser.username, "email", testUser.password, testUser.user_info)
                .then(() => done(new Error()))
                .catch(() => done());
        });

        it("should fail with an invalid password", (done) => {
            User.create(testUser.username, testUser.email, "passw", testUser.user_info)
                .then(() => done(new Error()))
                .catch(() => done());
        });

        it("should create the user when valid arguments are passed", async () => {
            let user = await User.create(testUser.username, testUser.email, testUser.password, testUser.user_info);

            assert.strictEqual(user.email, testUser.email);
            assert.strictEqual(user.username, testUser.username);
            assert.strictEqual(user.user_info, testUser.user_info);
        });
    });

    describe("save", () => {
        it("should save the user data", async () => {
            let user = await User.create(testUser.username, testUser.email, testUser.password, testUser.user_info);
            await user.save();

            let userData: UserTuple[] = await query(`SELECT * FROM user WHERE user_id = '${user.user_id}'`);
            let userInfo: UserInfoTuple[] = await query(`SELECT * FROM user_info WHERE user_id = '${user.user_id}'`);

            assert.strictEqual(userData[0]?.email, testUser.email);
            assert.strictEqual(userData[0]?.username, testUser.username);

            assert.strictEqual(userInfo.length, Object.getOwnPropertyNames(testUser.user_info).length);
            for (let tuple of userInfo) {
                assert.strictEqual(tuple.value, testUser.user_info[tuple.name]);
            }
        });

        it("should fail when the user already exists", async () => {
            try {
                let user = await User.create(testUser.username, testUser.email, testUser.password, testUser.user_info);
                await user.save();
                throw new Error("Didn't fail");
            } catch(err) {
                if (!(err instanceof ServerError && err.message === "User already exists"))
                    throw err;
            }
        });
    });
});
