const mysql = require("mysql");
const sqlite3 = require("sqlite3");
const util = require("util");
const { generateToken } = require("../api/utils");
const uuid = require("uuid").v4;
const logger = require("../logger");

export interface TableRow {
    [name: string]: any;
}

export enum DBErrorType {
    DUPLICATE,
    UNKNOWN
}

export class DBError extends Error {
    public type: DBErrorType;

    constructor(type: DBErrorType, message?: string) {
        super(message);
        this.type = type;
    }
}

let query;
export { query };

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
        logger.info("Connecting to db");
        if (config.dbms === "mysql") {
            exports.pool = mysql.createPool(config);
            exports.query = util.promisify(exports.pool.query).bind(exports.pool);
            resolve(undefined);
        } else if (config.dbms === "sqlite") {
            exports.connection = new sqlite3.Database(config.path);
            exports.query = util.promisify(exports.connection.all).bind(exports.connection);
            resolve(undefined);
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
        },
        {
            name: "challenge",
            type: "TEXT",
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
            options: ""
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
    await exports.query(`INSERT INTO client (client_id, client_secret, name, dev_id) VALUES ('${uuid()}', '${dashboard_secret}', 'Dashboard', '')`);
    if (dashboard_uri) {
        const dashboard_id = await exports.getDashboardId();
        await exports.query(`INSERT INTO redirect_uri (client_id, redirect_uri) VALUES ('${dashboard_id}', '${dashboard_uri}')`);
    }
    dashboard_id = await getDashboardId();
}

let dashboard_id;
export { dashboard_id };

export async function getDashboardId () {
    return (await exports.query("SELECT client_id FROM client WHERE name = 'Dashboard'"))[0].client_id;
}

/**
 * Inserts a row into a table
 * @param {string} table - Name of the table
 * @param {Object} row - fields to be inserted
 */
export async function insert (table: string, row: TableRow) {
    let keys: string[] = [];
    let values: string[] = [];
    for (let field in row) {
        keys.push(field);
        values.push("\"" + row[field] + "\"");
    }
    try {
        await exports.query(`INSERT INTO ${table} (${keys.join(", ")}) VALUES (${values.join(", ")})`);
    } catch(err) {
        if (err.code === "ER_DUP_ENTRY" || err.code === "SQLITE_CONSTRAINT")
            throw new DBError(DBErrorType.DUPLICATE);
        throw new DBError(DBErrorType.UNKNOWN);
    }
}

export async function update(table: string, condition: string, data: TableRow) {
    let datastring = "";
    for (let key in data) {
        datastring += key + " = " + data[key] + ", ";
    }
    datastring = datastring.slice(0, -2);
    await exports.query(`UPDATE ${table} SET ${datastring} WHERE ${condition}`);
}
