import { ClientTuple, RedirectUriTuple, AccessTokenTuple, RefreshTokenTuple } from '../../db/schemas';
import { query } from '../../db/db';
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
        let clientResults: ClientTuple[] = await query(`SELECT * FROM client WHERE client_id = '${client_id}'`);
        if (clientResults.length !== 1)
            throw new ServerError(404, "Client " + client_id + " not found");

        let client_tuple = clientResults[0];

        let redirect_uris = await this.getUris(client_id);

        return new Client(client_tuple.client_id, client_tuple.client_secret, client_tuple.name, client_tuple.dev_id, redirect_uris, false);
    }

    public static async fromName(name: string): Promise<Client> {
        let clientResults: ClientTuple[] = await query(`SELECT * FROM client WHERE name = '${name}'`);
        if (clientResults.length !== 1)
            throw new ServerError(404, "Client " + name + " not found");

        let client_tuple = clientResults[0];

        let redirect_uris = await this.getUris(client_tuple.client_id);

        return new Client(client_tuple.client_id, client_tuple.client_secret, client_tuple.name, client_tuple.dev_id, redirect_uris, false);
    }

    public static async fromAccessToken(access_token: string): Promise<Client> {
        if (access_token.startsWith("Bearer ")) access_token = access_token.substring("Bearer ".length);
        let results: AccessTokenTuple[] = await query(`SELECT * FROM access_token WHERE access_token = '${access_token}'`);
        if (results.length === 0 || results[0].expires < currentUnixTime())
            throw new ServerError(403, "Invalid access_token");
        return await this.fromId(results[0].client_id);
    }

    public static async fromRefreshToken(refresh_token: string): Promise<Client> {
        let results: RefreshTokenTuple[] = await query(`SELECT * FROM refresh_token WHERE refresh_token = '${refresh_token}'`);
        if (results.length !== 1 || results[0].expires < currentUnixTime())
            throw new ServerError(403, "Invalid refresh_token");
        return await this.fromId(results[0].client_id);
    }

    private static async getUris(client_id: string): Promise<string[]> {
        let uriResults: RedirectUriTuple[] = await query(`SELECT * FROM redirect_uri WHERE client_id = '${client_id}'`);
        return uriResults.map(val => val.redirect_uri);
    }

    public async save() {
        // TODO
    }

    public async delete() {
        await query(`DELETE FROM authorization_code WHERE client_id = '${this._client_id}'`);
        await query(`DELETE FROM access_token WHERE client_id = '${this._client_id}'`);
        await query(`DELETE FROM refresh_token WHERE client_id = '${this._client_id}'`);
        await query(`DELETE FROM client WHERE client_id = '${this._client_id}'`);
        await query(`DELETE FROM redirect_uri WHERE client_id = '${this._client_id}'`);
    }
}
