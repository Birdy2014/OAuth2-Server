import mysql from 'mysql';
import SQLITE_Database, { SqliteError } from 'better-sqlite3';
import { generateToken } from '../api/utils';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../Logger';
import { TableRow, tables, TableDataTypes, TableSchema } from './schemas';
import { ConfigReader } from '../ConfigReader';

enum DBMS {
    MYSQL,
    SQLITE
}

export enum DBErrorType {
    DUPLICATE,
    NO_TABLE,
    UNKNOWN
}

type DatabaseValue = (number|string|Buffer|null);

export class DBError extends Error {
    public type: DBErrorType;

    constructor(type: DBErrorType, message?: string) {
        if (!message) {
            switch (type) {
                case DBErrorType.DUPLICATE:
                    message = 'Duplicate Entry';
                    break;
                case DBErrorType.UNKNOWN:
                    message = 'Unknown Error';
                    break;
            }
        }
        super(message);
        this.type = type;
        this.name = 'DBError';
    }
}

export class Database {
    static query: any;
    static dashboard_id: string = '';
    static dbms: DBMS;
    static database: SQLITE_Database.Database;
    static pool: mysql.Pool;

    static async init(dashboard_uri: string): Promise<boolean> {
        switch (ConfigReader.config.db.dbms) {
            case "mysql":
                Database.dbms = DBMS.MYSQL;
                break;
            case "sqlite":
                Database.dbms = DBMS.SQLITE;
                break;
            default:
                throw new Error("Invalid dbms: " + ConfigReader.config.db.dbms);
        }
        await this.connect();
        if (!(await this.checkDatabase())) {
            await this.initDatabase(dashboard_uri);
            return true;
        } else {
            return false;
        }
    }

    static close() {
        switch (this.dbms) {
            case DBMS.MYSQL:
                this.pool.end();
                break;
            case DBMS.SQLITE:
                this.database.close();
        }
    }

    static connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            Logger.info("Connecting to db");
            if (Database.dbms === DBMS.MYSQL) {
                this.pool = mysql.createPool(ConfigReader.config.db);
                this.getDashboardId().then(id => {
                    this.dashboard_id = id;
                    resolve();
                }).catch(() => resolve());
            } else if (Database.dbms === DBMS.SQLITE) {
                this.database = new SQLITE_Database(ConfigReader.config.db.path);
                this.getDashboardId().then(id => {
                    this.dashboard_id = id;
                    resolve();
                }).catch(() => resolve());
            } else {
                reject();
            }
        });
    }

    /**
     * check if all necessary tables and columns exist
     * @returns {boolean}
    */
    static async checkDatabase(): Promise<boolean> {
        try {
            await this.select("access_token");
            await this.select("authorization_code");
            await this.select("client");
            await this.select("permissions");
            await this.select("redirect_uri");
            await this.select("refresh_token");
            await this.select("user");
            await this.select("verification_code");
            await this.select("user_info");
            return true;
        } catch (err: any) {
            if (Database.dbms === DBMS.SQLITE) return false; //temporary workaround for sqlite
            if (err.type === DBErrorType.NO_TABLE)
                return false;
            throw err;
        }
    }

    static async createTable(name: string, columns: TableSchema) {
        let mysql = this.dbms === DBMS.MYSQL;
        let q = `CREATE TABLE IF NOT EXISTS ${name}(`;
        let primary = "";
        let unique = "";
        for (const name in columns) {
            const column = columns[name];
            if (column.primary) {
                if (mysql && column.type === TableDataTypes.TEXT)
                    primary += `${name}(100), `;
                else
                    primary += `${name}, `;
            } else if (column.unique) {
                if (mysql && column.type === TableDataTypes.TEXT)
                    unique += `${name}(100), `;
                else
                    unique += `${name}, `;
            }

            let type: string = "";
            switch (column.type) {
                case TableDataTypes.TEXT:    type = "TEXT";    break;
                case TableDataTypes.INTEGER: type = "INTEGER"; break;
                case TableDataTypes.BOOLEAN: type = "BOOLEAN"; break;
            }
            q += `${name} ${type} ${column.options}, `;
        }
        if (primary)
            q += "PRIMARY KEY (" + primary.substring(0, primary.length - 2) + ")" + (unique ? ", " : " ");
        if (unique)
            q += (mysql ? "UNIQUE KEY (" : "UNIQUE (") + unique.substring(0, unique.length - 2) + ") ";
        q += ")";

        await this.run(q);
    }

    /**
     * Creates all the necessary tables of the database
     */
    static async initDatabase(dashboard_uri: string) {
        //create client table
        for (let name in tables) {
            await this.createTable(name, tables[name]);
        }

        //add Dashboard client
        const dashboard_secret = generateToken(12);
        await this.run(`INSERT INTO client (client_id, client_secret, name, dev_id) VALUES ('${uuidv4()}', '${dashboard_secret}', 'Dashboard', '')`);
        if (dashboard_uri) {
            const dashboard_id = await this.getDashboardId();
            await this.run(`INSERT INTO redirect_uri (client_id, redirect_uri) VALUES ('${dashboard_id}', '${dashboard_uri}')`);
        }
    }

    static async getDashboardId() {
        return (await this.get("SELECT client_id FROM client WHERE name = 'Dashboard'"))?.client_id;
    }

    private static convertRowTypes<T extends TableRow>(table: string, row: TableRow): T {
        let output: Object = {};
        for (let key in row) {
            switch (tables[table][key].type) {
                case TableDataTypes.BOOLEAN:
                    output[key] = row[key] === true || row[key] === "true" || row[key] === 1;
                    break;
                case TableDataTypes.INTEGER:
                    output[key] = parseInt(row[key]);
                    break;
                default:
                    output[key] = row[key];
            }
        }
        return output as T;
    }

    private static convertCondition(condition?: Object): [string, string[]] {
        if (!condition)
            return ['', []]
        let entries = Object.entries(condition);
        let out = 'WHERE ';
        out += entries.map(v => `${v[0]} = ?`).join(' AND ');
        return [out, entries.map(v => v[1])];
    }

    private static getError(error: any): DBError {
        if (Database.dbms === DBMS.MYSQL) {
            switch (error.errno) {
                case 1146:
                    return new DBError(DBErrorType.NO_TABLE);
                case 1062: // ER_DUP_ENTRY
                case 3026: // ER_DUP_LIST_ENTRY
                    return new DBError(DBErrorType.DUPLICATE);
                default:
                    return new DBError(DBErrorType.UNKNOWN);
            }
        }

        if (Database.dbms === DBMS.SQLITE) {
            if (error instanceof SqliteError) {
                if (error.code === 'SQLITE_CONSTRAINT_UNIQUE')
                    return new DBError(DBErrorType.DUPLICATE);
                else if (error.message.startsWith('no such table'))
                    return new DBError(DBErrorType.NO_TABLE);
            }
            console.log(error);
            return new DBError(DBErrorType.UNKNOWN);
        }

        return new DBError(DBErrorType.UNKNOWN, 'Invalid DBMS');
    }

    static run(sql: string, params: any[] = []): Promise<void> {
        return new Promise((resolve, reject) => {
            switch (this.dbms) {
                case DBMS.MYSQL: {
                    this.pool.query(sql, params, (error: mysql.MysqlError|null, results: any[], fileds: mysql.FieldInfo[]|undefined) => {
                        if (error)
                            return reject(this.getError(error));
                        return resolve();
                    });
                    break;
                }
                case DBMS.SQLITE: {
                    try {
                        params = this.prepareDatabaseValues(params);
                        let statement = this.database.prepare(sql);
                        statement.run(params);
                        return resolve();
                    } catch(err) {
                        return reject(this.getError(err));
                    }
                }
            }
        });
    }

    static get(sql: string, params: any[] = []): Promise<TableRow|undefined> {
        return new Promise((resolve, reject) => {
            switch (this.dbms) {
                case DBMS.MYSQL: {
                    this.pool.query(sql, params, (error: mysql.MysqlError|null, results: any[], _: mysql.FieldInfo[]|undefined) => {
                        if (error)
                            return reject(this.getError(error));
                        if (!results || results.length === 0)
                            return resolve(undefined)
                        return resolve(results[0] as TableRow);
                    });
                    break;
                }
                case DBMS.SQLITE: {
                    try {
                        params = this.prepareDatabaseValues(params);
                        let statement = this.database.prepare(sql);
                        return resolve(statement.get(params));
                    } catch(err) {
                        return reject(this.getError(err));
                    }
                }
            }
        });
    }

    static all(sql: string, params: any[] = []): Promise<TableRow[]> {
        return new Promise((resolve, reject) => {
            switch (this.dbms) {
                case DBMS.MYSQL: {
                    this.pool.query(sql, params, (error: mysql.MysqlError|null, results: any[], _: mysql.FieldInfo[]|undefined) => {
                        if (error)
                            return reject(this.getError(error));
                        return resolve(results as TableRow[]);
                    });
                    break;
                }
                case DBMS.SQLITE: {
                    try {
                        params = this.prepareDatabaseValues(params);
                        let statement = this.database.prepare(sql);
                        return resolve(statement.all(params));
                    } catch(err) {
                        return reject(this.getError(err));
                    }
                }
            }
        });
    }

    static async select<T extends TableRow>(table: string, condition?: Object): Promise<T|undefined> {
        const conditionString = this.convertCondition(condition);
        const queryStr = `SELECT * FROM ${table} ${conditionString[0]} LIMIT 1;`;
        let row = await this.get(queryStr, conditionString[1]);
        if (row === undefined)
            return undefined;
        return Database.convertRowTypes<T>(table, row);
    }

    static async selectAll<T extends TableRow>(table: string, condition?: Object): Promise<T[]> {
        const conditionString = this.convertCondition(condition);
        const queryStr = `SELECT * FROM ${table} ${conditionString[0]};`;
        let rows = await this.all(queryStr, conditionString[1]);
        return rows.map(value => Database.convertRowTypes<T>(table, value));
    }

    /**
     * Inserts a row into a table
     * @param {string} table - Name of the table
     * @param {Object} row - fields to be inserted
     */
    static async insert(table: string, row: TableRow) {
        if (Object.entries(row).length === 0)
            return;
        let keys: string[] = [];
        let values: any[] = [];
        for (let field in row) {
            keys.push(field);
            values.push(row[field]);
        }
        await this.run(`INSERT INTO ${table} (${keys.join(", ")}) VALUES (${values.map(v => '?').join(", ")});`, [ ...values ]);
    }

    static async update(table: string, condition: Object, data: TableRow) {
        const conditionString = this.convertCondition(condition);

        if (Object.entries(data).length === 0)
            return;
        let values: string[] = [];
        for (let key in data) {
            values.push(data[key]);
        }

        let datastring = "";
        for (let key in data) {
            datastring += `${key} = ?, `;
        }
        datastring = datastring.slice(0, -2);
        await this.run(`UPDATE ${table} SET ${datastring} ${conditionString[0]};`, [ ...values, ...conditionString[1] ]);
    }

    static async delete(table: string, condition: Object) {
        const conditionString = this.convertCondition(condition);
        await this.run(`DELETE FROM ${table} ${conditionString[0]};`, conditionString[1]);
    }

    static async clearTable(table: string) {
        await this.run(`DELETE FROM ${table};`);
    }

    private static prepareDatabaseValue(value: any): DatabaseValue {
        if (typeof value in [ 'number', 'string', 'Buffer', 'null' ])
            return value;
        else
            return value.toString();
    }

    private static prepareDatabaseValues(values: any[]): DatabaseValue[] {
        return values.map(this.prepareDatabaseValue, values);
    }
}
