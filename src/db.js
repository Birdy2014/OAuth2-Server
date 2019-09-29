const mysql = require("mysql");
const sqlite3 = require("sqlite3");
const util = require("util");
const { generateToken } = require("./api/utils");
const uuid = require("uuid/v4");

exports.init = async (config, dashboard_uri) => {
    await connect(config);
    if (!(await checkDatabase(config))) {
        await initDatabase(config, dashboard_uri);
        return true;
    } else {
        return false;
    }
}

function connect(config) {
    return new Promise((resolve, reject) => {
        if (config.dbms === "mysql") {
            exports.connection = mysql.createConnection(config);
            exports.query = util.promisify(this.connection.query).bind(exports.connection);

            //Reconnect if the connection is closed
            exports.connection.on("error", (err) => {
                if (err.code === 'PROTOCOL_CONNECTION_LOST') {
                    connect();
                } else {
                    reject(err);
                }
            });

            exports.connection.connect(err => {
                if (err) {
                    reject("Can't connect to the Database");
                }
                resolve();
            });
        } else if (config.dbms === "sqlite") {
            exports.connection = new sqlite3.Database(config.path);
            exports.query = util.promisify(exports.connection.all).bind(exports.connection);
            resolve();
        } else {
            reject("Invalid dbms");
        }
    });
}

/**
 * check if all necessary tables and columns exist
 * @returns {boolean}
*/
async function checkDatabase(config) {
    try {
        await exports.query("SELECT * FROM access_token");
        await exports.query("SELECT * FROM authorization_code");
        await exports.query("SELECT * FROM client");
        await exports.query("SELECT * FROM permissions");
        await exports.query("SELECT * FROM redirect_uri");
        await exports.query("SELECT * FROM refresh_token");
        await exports.query("SELECT * FROM user");
        await exports.query("SELECT * FROM verification_code");
        await exports.query("SELECT * FROM user_info");
        return true;
    } catch (e) {
        if (config.dbms === "sqlite") return false; //temporary workaround for sqlite
        if (e.code === "ER_NO_SUCH_TABLE")
            return false;
        else
            throw e;
    }
}

async function createTable(config, name, columns) {
    let mysql = config.dbms == "mysql";
    let q = `CREATE TABLE IF NOT EXISTS ${name}(`;
    let primary = "";
    let unique = "";
    for (const column of columns) {
        if (column.primary) {
            if (mysql && column.type === "TEXT")
                primary += `${column.name}(100), `;
            else
                primary += `${column.name}, `;
        } else if (column.unique) {
            if (mysql && column.type === "TEXT")
                unique += `${column.name}(100), `;
            else
                unique += `${column.name}, `;
        }
        q += `${column.name} ${column.type} ${column.options}, `;
    }
    if (primary)
        q += "PRIMARY KEY (" + primary.substring(0, primary.length - 2) + ")" + (unique ? ", " : " ");
    if (unique)
        q += (mysql ? "UNIQUE KEY (" : "UNIQUE (") + unique.substring(0, unique.length - 2) + ") ";
    q += ")";

    await exports.query(q);
}

/**
 * Creates all the necessary tables of the database
 */
async function initDatabase(config, dashboard_uri) {
    //create client table
    await createTable(config, "client", [
        {
            name: "client_id",
            type: "TEXT",
            options: "NOT NULL",
            primary: true
        },
        {
            name: "client_secret",
            type: "TEXT",
            options: "NOT NULL"
        },
        {
            name: "name",
            type: "TEXT",
            options: "NOT NULL",
            unique: true
        },
        {
            name: "dev_id",
            type: "TEXT",
            options: "NOT NULL"
        }
    ]);

    //create user table
    await createTable(config, "user", [
        {
            name: "user_id",
            type: "TEXT",
            options: "NOT NULL",
            primary: true
        },
        {
            name: "username",
            type: "TEXT",
            options: "NOT NULL"
        },
        {
            name: "email",
            type: "TEXT",
            options: "NOT NULL",
            unique: true
        },
        {
            name: "password_hash",
            type: "TEXT",
            options: "NOT NULL"
        },
        {
            name: "verified",
            type: "BOOLEAN",
            options: "NOT NULL DEFAULT FALSE"
        }
    ]);

    //create authorization_code table
    await createTable(config, "authorization_code", [
        {
            name: "authorization_code",
            type: "TEXT",
            options: "NOT NULL",
            primary: true
        },
        {
            name: "user_id",
            type: "TEXT",
            options: "NOT NULL"
        },
        {
            name: "client_id",
            type: "TEXT",
            options: "NOT NULL"
        },
        {
            name: "expires",
            type: "INTEGER",
            options: "NOT NULL"
        }
    ]);

    //create access_token table
    await createTable(config, "access_token", [
        {
            name: "access_token",
            type: "TEXT",
            options: "NOT NULL",
            primary: true
        },
        {
            name: "user_id",
            type: "TEXT",
            options: "NOT NULL"
        },
        {
            name: "client_id",
            type: "TEXT",
            options: "NOT NULL"
        },
        {
            name: "expires",
            type: "INTEGER",
            options: ""
        }
    ]);

    //create refresh_token table
    await createTable(config, "refresh_token", [
        {
            name: "refresh_token",
            type: "TEXT",
            options: "NOT NULL",
            primary: true
        },
        {
            name: "user_id",
            type: "TEXT",
            options: "NOT NULL"
        },
        {
            name: "client_id",
            type: "TEXT",
            options: "NOT NULL"
        },
        {
            name: "expires",
            type: "INTEGER",
            options: "NOT NULL"
        }
    ]);

    //create permissions table
    await createTable(config, "permissions", [
        {
            name: "user_id",
            type: "TEXT",
            options: "NOT NULL",
            primary: true
        },
        {
            name: "client_id",
            type: "TEXT",
            options: "NOT NULL",
            primary: true
        },
        {
            name: "permission",
            type: "TEXT",
            options: "NOT NULL",
            primary: true
        }
    ]);

    //create redirect_uri table
    await createTable(config, "redirect_uri", [
        {
            name: "client_id",
            type: "TEXT",
            options: "NOT NULL",
            primary: true
        },
        {
            name: "redirect_uri",
            type: "TEXT",
            options: "NOT NULL",
            primary: true
        }
    ]);

    //create verification_code table for email verification, "email" for new email or empty for for registration
    await createTable(config, "verification_code", [
        {
            name: "verification_code",
            type: "TEXT",
            options: "NOT NULL",
            primary: true
        },
        {
            name: "user_id",
            type: "TEXT",
            options: "NOT NULL",
            primary: true
        },
        {
            name: "email",
            type: "TEXT",
            options: "NOT NULL"
        },
        {
            name: "change_password",
            type: "BOOLEAN",
            options: "NOT NULL DEFAULT FALSE"
        }
    ]);

    //create user_info table for extra user information
    await createTable(config, "user_info", [
        {
            name: "user_id",
            type: "TEXT",
            options: "NOT NULL",
            primary: true
        },
        {
            name: "name",
            type: "TEXT",
            options: "NOT NULL",
            primary: true
        },
        {
            name: "value",
            type: "TEXT",
            options: "NOT NULL"
        }
    ]);

    //add Dashboard client
    const dashboard_secret = generateToken(12);
    exports.query(`INSERT INTO client (client_id, client_secret, name, dev_id) VALUES ('${uuid()}', '${dashboard_secret}', 'Dashboard', '')`);
    if (dashboard_uri) {
        const dashboard_id = await exports.getDashboardId();
        exports.query(`INSERT INTO redirect_uri (client_id, redirect_uri) VALUES ('${dashboard_id}', '${dashboard_uri}')`);
    }
}

exports.getDashboardId = async () => {
    return (await exports.query("SELECT client_id FROM client WHERE name = 'Dashboard'"))[0].client_id;
}

//check if client exists and is valid
exports.validateClient = async (client_id, client_secret, redirect_uri) => {
    //Normal Client
    if (redirect_uri) {
        let results = await exports.query(`SELECT redirect_uri, name FROM redirect_uri JOIN client ON redirect_uri.client_id = client.client_id WHERE redirect_uri.client_id = '${client_id}'`);
        for (const item of results) {
            if (redirect_uri.startsWith(item.redirect_uri)) {
                return item.name;
            }
        }
        return false;
    } else if (client_secret) {
        let results = await exports.query(`SELECT * FROM client WHERE client_id='${client_id}' AND client_secret='${client_secret}'`);
        return results.length === 1 ? results[0].name : false;
    }
}