import crypto from 'crypto';
import { Database } from '../../db/db';
import { AccessTokenTuple, AuthorizationCodeTuple, RefreshTokenTuple } from '../../db/schemas';
import { ServerError, currentUnixTime, generateToken } from '../utils';
import { Client } from './Client';
import { User } from './User';
import { ConfigReader } from '../../ConfigReader';

export interface TokenExport {
    token: string;
    expires: number;
}

export class Token {
    private _user: User;
    private _client: Client;

    public get user() {
        return this._user;
    }

    public get client() {
        return this._client;
    }

    private constructor(user: User, client: Client) {
        this._user = user;
        this._client = client;
    }

    public static async create(user: User, client: Client): Promise<Token> {
        return new Token(user, client);
    }

    public static async fromAccessToken(access_token: string): Promise<Token> {
        if (access_token.startsWith("Bearer ")) access_token = access_token.substring("Bearer ".length);
        let result: AccessTokenTuple|undefined = await Database.select<AccessTokenTuple>('access_token', `access_token = '${access_token}'`);
        if (result === undefined || result.expires < currentUnixTime())
            throw new ServerError(403, "Invalid access_token");
        let user = await User.fromLogin(result.user_id);
        let client = await Client.fromId(result.client_id);
        return new Token(user, client);
    }

    public static async fromRefreshToken(refresh_token: string): Promise<Token> {
        let result: RefreshTokenTuple|undefined = await Database.select<RefreshTokenTuple>('refresh_token', `refresh_token = '${refresh_token}'`);
        if (result === undefined || result.expires < currentUnixTime())
            throw new ServerError(403, "Invalid refresh_token");
        let user = await User.fromLogin(result.user_id);
        let client = await Client.fromId(result.client_id);
        return new Token(user, client);
        // TODO update refresh_token expires
    }

    public static async fromAuthorizationCode(authorization_code: string, code_verifier: string): Promise<Token> {
        let result = await Database.select<AuthorizationCodeTuple>('authorization_code', `authorization_code = '${authorization_code}'`);
        if (result === undefined || result.expires < currentUnixTime())
            throw new ServerError(403, "Invalid authorization_code");

        let hash = crypto.createHash("sha256").update(code_verifier).digest("base64").replace(/\+/g, "_");
        if (hash !== result.challenge)
            throw new ServerError(403, "Invalid code_verifier");

        await Database.delete('authorization_code', `authorization_code = '${authorization_code}'`);

        let user = await User.fromLogin(result.user_id);
        let client = await Client.fromId(result.client_id);
        return new Token(user, client);
    }

    public async createAccessToken(): Promise<TokenExport> {
        let expires = currentUnixTime() + ConfigReader.config.accessTokenExpirationTime;
        let access_token = generateToken(ConfigReader.config.accessTokenLength);
        await Database.insert("access_token", { access_token, user_id: this.user.user_id, client_id: this.client.client_id, expires });

        return { token: access_token, expires };
    }

    public async createRefreshToken(): Promise<TokenExport> {
        let expires = currentUnixTime() + ConfigReader.config.refreshTokenExpirationTime;
        let refresh_token = generateToken(ConfigReader.config.refreshTokenLength);
        await Database.insert("refresh_token", { refresh_token, user_id: this.user.user_id, client_id: this.client.client_id, expires });

        return { token: refresh_token, expires };
    }

    public async createAuthorizationCode(challenge: string): Promise<TokenExport> {
        if (challenge === '')
            throw new ServerError(400, 'Invalid challenge');
        let expires = currentUnixTime() + ConfigReader.config.authorizationCodeExpirationTime;
        let authorization_code = generateToken(30);
        await Database.insert("authorization_code", { authorization_code, user_id: this.user.user_id, client_id: this.client.client_id, challenge, expires });
        return { token: authorization_code, expires };
    }
}
