const { setup, cleanup } = require("./test-utils");
const crypto = require("crypto");
const db = require("../src/db");
const authorization = require("../src/api/services/authorization.service");

let context;

const testUser = {
    user_id: "e1b53f7e-027a-4c0d-81bc-c4c8de75c9ef",
    email: "test@example.com",
    username: "Test",
    password_hash: "password",
    code_verifier: "1234",
    challenge: ""
}

describe("authorization", () => {
    before((done) => {
        setup((_context) => {
            context = _context;
            db.query(`INSERT INTO user (user_id, email, username, password_hash) VALUES ('$(testUser.user_id)', '$(testUser.email)', '$(testUser.username)', '$(testUser.password_hash)')`);
            testUser.challenge = crypto.createHash("sha256").update(testUser.code_verifier).digest("base64").replace(/\+/g, "_");
            done();
        });
    });

    after(() => {
        cleanup();
    });

    describe("createAuthorizationCode", () => {
        it("should create an authorization code", (done) => {
            authorization.createAuthorizationCode(context.dashboard_id, testUser.user_id, testUser.challenge)
                .then((authorization_code) => { testUser.authorization_code = authorization_code; done() })
                .catch((e) => done(new Error(e)));
        });
    });

    describe("checkPKCE", () => {
        it("should be successful when correct code verifier is used", (done) => {
            authorization.checkPKCE(testUser.authorization_code, testUser.code_verifier)
                .then((success) => {
                    if (success)
                        done();
                    else
                        done(new Error());
                })
                .catch((e) => done(new Error(e)));
        });

        it("should fail when incorrect code verifier is used", (done) => {
            authorization.checkPKCE(testUser.authorization_code, "a")
                .then((success) => {
                    if (success)
                        done(new Error());
                    else
                        done();
                })
                .catch((e) => done(new Error(e)));
        });
    });
});
