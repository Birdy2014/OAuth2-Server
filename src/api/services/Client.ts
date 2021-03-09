import { ClientTuple, RedirectUriTuple, AccessTokenTuple, RefreshTokenTuple } from '../../db/schemas';
import { Database } from '../../db/db';
import { v4 as uuidv4 } from 'uuid';
import { ServerError, currentUnixTime, generateToken } from '../utils';

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

    private static async getUris(client_id: string): Promise<string[]> {
        let uriResults: RedirectUriTuple[] = await Database.selectAll<RedirectUriTuple>('redirect_uri', `client_id = '${client_id}'`);
        return uriResults.map(val => val.redirect_uri);
    }

    public async save() {
        // TODO
    }

    public async delete() {
        await Database.delete('authorization_code', `client_id = '${this._client_id}'`);
        await Database.delete('access_token', `client_id = '${this._client_id}'`);
        await Database.delete('refresh_token', `client_id = '${this._client_id}'`);
        await Database.delete('client', `client_id = '${this._client_id}'`);
        await Database.delete('redirect_uri', `client_id = '${this._client_id}'`);
    }
}
