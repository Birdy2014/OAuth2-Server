const { setup, cleanup } = require("./test-utils");
const user = require("../src/api/services/user.service");

const testUser = {
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

    describe("createUser", () => {
        it("should fail with an invalid email address", (done) => {
            user.createUser("email", testUser.username, testUser.password, testUser.user_info)
                .then(() => done(new Error()))
                .catch(() => done());
        });

        it("should fail with an invalid password", (done) => {
            user.createUser(testUser.email, testUser.username, "passw", testUser.user_info)
                .then(() => done(new Error()))
                .catch(() => done());
        });

        it("should create the user when valid arguments are passed", (done) => {
            user.createUser(testUser.email, testUser.username, testUser.password, testUser.user_info)
                .then((user_id) => { testUser.user_id = user_id; done() })
                .catch((e) => done(new Error(e.error)));
        });

        it("should fail when the user already exists", (done) => {
            user.createUser(testUser.email, testUser.username, testUser.password, testUser.user_info)
                .then(() => done(new Error()))
                .catch(() => done());
        });
    });
});
