const express = require("express");
const authRouter = require("./api/authorization/AuthRouter");
const tokenRouter = require("./api/token/TokenRouter");
const tokenInfoRouter = require("./api/token/TokenInfoRouter");
const userRouter = require("./api/user/UserRouter");
const clientRouter = require("./api/client/ClientRouter");
const permissionRouter = require("./api/permission/PermissionRouter");
const configReader = require("./ConfigReader");
const dbInterface = require("./DBInterface");
const { currentUnixTime } = require("./api/utils");
const adminConsole = require("./adminConsole/adminConsole");
var app = express();

//create tables if they don't exist
dbInterface.initDatabase();

app.use(express.json());
app.use(express.urlencoded({extended: true}));

//Frontend
app.use("/authorize", express.static(__dirname + "/websites/authorization"));
app.use("/register", express.static(__dirname + "/websites/register"));
app.use("/dashboard", express.static(__dirname + "/websites/dashboard"));

//Backend
app.use("/api/authorize", authRouter);
app.use("/api/token", tokenRouter);
app.use("/api/token_info", tokenInfoRouter);
app.use("/api/user", userRouter);
app.use("/api/client", clientRouter);
app.use("/api/permission", permissionRouter);

//delete old access tokens, run once every day
setInterval(() => {
    dbInterface.query(`DELETE FROM access_token WHERE expires < ${currentUnixTime()}`);
}, 86400000);

app.listen(configReader.port());

//start console
adminConsole.start();