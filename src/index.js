const ConfigReader = require("./ConfigReader");
const DBInterface = require("./DBInterface");
const configReader = new ConfigReader(__dirname + "/../config");
const dbInterface = new DBInterface(configReader.mysqlConfig());
const express = require("express");
const authRouter = require("./api/authorization/AuthRouter");
const tokenRouter = require("./api/token/TokenRouter");
const tokenInfoRouter = require("./api/token/TokenInfoRouter");
const userRouter = require("./api/user/UserRouter");
const clientRouter = require("./api/client/ClientRouter");
const permissionRouter = require("./api/permission/PermissionRouter");
const verificationRouter = require("./api/verification/VerificationRouter");
const { currentUnixTime, respond } = require("./api/utils");
const adminConsole = require("./adminConsole/adminConsole");
const path = require("path");
const cors = require("cors");
var app = express();

async function main() {
    //create tables if they don't exist
    if (!(await dbInterface.checkDatabase())) {
        await dbInterface.initDatabase(configReader.url());
        console.log("Tables created");
    }

    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    //Frontend
    app.use("/authorize", express.static(__dirname + "/../websites/authorization"));
    app.use("/register", express.static(__dirname + "/../websites/register"));
    app.use("/dashboard", express.static(__dirname + "/../websites/dashboard"));
    app.use("/verification", express.static(__dirname + "/../websites/verification"));

    //Backend
    app.use("/api/authorize", authRouter);
    app.use("/api/token", tokenRouter);
    app.use("/api/token_info", tokenInfoRouter);
    app.use("/api/user", userRouter);
    app.use("/api/client", clientRouter);
    app.use("/api/permission", permissionRouter);
    app.get("/api/dashboard_id", async (req, res) => {
        let client_id = (await dbInterface.query("SELECT client_id FROM client WHERE name = 'Dashboard'"))[0].client_id;
        respond(res, 200, {client_id: client_id});
    });
    app.use("/api/verification", verificationRouter);

    //404
    app.use((req, res) => {
        res.status(404);
        if (req.accepts('html'))
            res.sendFile(path.resolve(__dirname + "/../websites/404.html"));
        else
            res.send({ status: 404 });
    });

    //delete old access tokens, run once every day
    setInterval(() => {
        dbInterface.query(`DELETE FROM access_token WHERE expires < ${currentUnixTime()}`);
    }, 86400000);

    app.listen(configReader.port());

    //start console
    adminConsole.start();
}

main().catch(e => console.error(e));