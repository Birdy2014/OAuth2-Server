import { ClientTuple, RedirectUriTuple } from '../../db/schemas';
import { Database, DBError, DBErrorType } from '../../db/db';
import { v4 as uuidv4 } from 'uuid';
import { ServerError, generateToken } from '../utils';

export class Client {
    private _client_id: string;
    private _client_secret: string|undefined;
    private _name: string;
    private _dev_id: string;
    private _redirect_uris: string[];

    private create: boolean;
    private c_name: boolean;
    private c_dev_id: boolean;
    private c_redirect_uris: string[];

    public get client_id() {
        return this._client_id;
    }

    public get client_secret() {
        return this._client_secret;
    }

    public get name() {
        return this._name;
    }

    public set name(name: string) {
        this._name = name;
        this.c_name = true;
    }

    public get dev_id() {
        return this._dev_id;
    }

    public set dev_id(dev_id: string) {
        this._dev_id = dev_id;
        this.c_dev_id = true;
    }

    public get redirect_uris() {
        return this._redirect_uris;
    }

    private constructor(client_id: string, client_secret: string|undefined, name: string, dev_id: string, redirect_uris: string[], create: boolean) {
        this._client_id = client_id;
        this._client_secret = client_secret;
        this._name = name;
        this._dev_id = dev_id;
        this._redirect_uris = redirect_uris;

        this.create = create;
        this.c_name = create;
        this.c_dev_id = create;
        this.c_redirect_uris = create ? [] : [...redirect_uris];
    }

    public static async create(name: string, dev_id: string, redirect_uri: string): Promise<Client> {
        return new Client(uuidv4(), generateToken(12), name, dev_id, [ redirect_uri ], true);
    }

    public static async fromId(client_id: string): Promise<Client> {
        let client_tuple: ClientTuple|undefined = await Database.select<ClientTuple>('client', `client_id = '${client_id}'`);
        if (client_tuple === undefined)
            throw new ServerError(404, "Client " + client_id + " not found");

        let redirect_uris = await this.getUris(client_id);

        return new Client(client_tuple.client_id, client_tuple.client_secret, client_tuple.name, client_tuple.dev_id, redirect_uris, false);
    }

    public static async fromName(name: string): Promise<Client> {
        let client_tuple: ClientTuple|undefined = await Database.select<ClientTuple>('client', `name = '${name}'`);
        if (client_tuple === undefined)
            throw new ServerError(404, "Client " + name + " not found");

        let redirect_uris = await this.getUris(client_tuple.client_id);

        return new Client(client_tuple.client_id, client_tuple.client_secret, client_tuple.name, client_tuple.dev_id, redirect_uris, false);
    }

    public static async fromIdUri(client_id: string, redirect_uri: string): Promise<Client> {
        let client = await Client.fromId(client_id);
        for (const uri of client.redirect_uris) {
            if (redirect_uri.startsWith(uri)) {
                return client;
            }
        }
        throw new ServerError(403, "Invalid redirect_uri");
    }

    private static async getUris(client_id: string): Promise<string[]> {
        let uriResults: RedirectUriTuple[] = await Database.selectAll<RedirectUriTuple>('redirect_uri', `client_id = '${client_id}'`);
        return uriResults.map(val => val.redirect_uri);
    }

    public async save() {
        try {
            let data: any = {};
            if (this.c_name) data.name = this._name;
            if (this.c_dev_id) data.dev_id = this._dev_id;

            if (this.create)
                await Database.insert("client", { client_id: this._client_id, ...data, client_secret: this._client_secret });
            else
                await Database.update("client", `client_id = '${this._client_id}'`, data)

            this.c_name = false;
            this.c_dev_id = false;
            this.create = false;

            // Insert new redirect_uris
            for (let uri of this._redirect_uris) {
                if (this.c_redirect_uris.includes(uri))
                    continue;
                let row: RedirectUriTuple = { client_id: this.client_id, redirect_uri: uri };
                await Database.insert("redirect_uri", row);
                this.c_redirect_uris.push(uri);
            }

            // Delete old redirect_uris
            for (let uri of this.c_redirect_uris) {
                if (this._redirect_uris.includes(uri))
                    continue;
                await Database.delete("redirect_uri", `client_id = '${this.client_id}' AND redirect_uri = '${uri}'`);
                this.c_redirect_uris = this.c_redirect_uris.filter(val => val !== uri);
            }
        } catch(err) {
            if (err instanceof DBError && err.type === DBErrorType.DUPLICATE)
                throw new ServerError(409, "User already exists");
            throw new ServerError(500, "Internal Server Error");
        }
    }

    public async delete() {
        await Database.delete('authorization_code', `client_id = '${this._client_id}'`);
        await Database.delete('access_token', `client_id = '${this._client_id}'`);
        await Database.delete('refresh_token', `client_id = '${this._client_id}'`);
        await Database.delete('client', `client_id = '${this._client_id}'`);
        await Database.delete('redirect_uri', `client_id = '${this._client_id}'`);
    }

    public removeUri(uri: string) {
        if (this._redirect_uris.indexOf(uri) === -1)
            throw new ServerError(404, "redirect_uri not found");
        this._redirect_uris = this._redirect_uris.filter(val => val !== uri);
    }
}
