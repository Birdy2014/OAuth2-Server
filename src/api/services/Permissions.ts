import { Database } from '../../db/db';
import { PermissionsTuple } from '../../db/schemas';

export interface PermissionList {
    [client_id: string]: string[];
}

export type PermissionsExport = string[];

export class Permissions {
    private _user_id: string;
    private _values: PermissionList;

    public get user_id() {
        return this._user_id;
    }

    public get values() {
        return this._values;
    }

    private constructor(user_id: string, values: PermissionList) {
        this._user_id = user_id;
        this._values = values;
    }

    public static async fromUserId(user_id: string) {
        let result: Array<PermissionsTuple> = await Database.selectAll<PermissionsTuple>('permissions', `user_id = '${user_id}'`);
        let values: PermissionList = {};
        result.forEach(tuple => {
            if (values[tuple.client_id] === undefined) values[tuple.client_id] = [];
            values[tuple.client_id].push(tuple.permission);
        });
        return new Permissions(user_id, values);
    }

    public has(client_id: string, permission: string): boolean {
        return this._values[client_id].includes(permission);
    }

    public add(client_id: string, permission: string) {
        if (this.has(client_id, permission))
            return;
        this._values[client_id].push(permission);
    }

    public del(client_id: string, permission: string) {
        this._values[client_id] = this._values[client_id].filter(val => val !== permission);
    }

    public async save() {
        // TODO
    }

    public export(client_id: string): PermissionsExport {
        return this._values[client_id];
    }
}
