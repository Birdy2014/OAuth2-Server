import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UserTuple, UserInfoTuple } from '../../db/schemas';
import { ServerError, generateToken, checkUsername, checkEmail, checkPassword } from '../utils';
import { Permissions, PermissionsExport } from './Permissions';
import { ConfigReader } from '../../ConfigReader';
import { DBError, DBErrorType, Database } from '../../db/db';
import { sendVerificationEmail } from './verification.service';

export interface UserInfo {
    [name: string]: string;
}

export interface UserExport {
    user_id: string;
    username: string;
    email: string;
    verified: boolean;
    admin: boolean;
    permissions: PermissionsExport;
    [name: string]: any;
}

export class User {
    private _user_id: string;
    private _username: string;
    private _email: string;
    private _password: string|undefined;
    private _password_hash: string|undefined;
    private _verified: boolean;
    private _user_info: UserInfo;

    // Values changed
    private create: boolean;
    private c_username: boolean;
    private c_email: boolean;
    private c_verified: boolean;
    private c_user_info: UserInfo;

    public permissions: Permissions;

    public get user_id() {
        return this._user_id;
    }

    public get username() {
        return this._username;
    }

    public set username(username: string) {
        if (this._username === username) return;
        if (!checkUsername(username)) throw new ServerError(400, "Invalid Username");
        this._username = username;
        this.c_username = true;
    }

    public get email() {
        return this._email;
    }

    public set email(email: string) {
        if (this._email === email) return;
        if (!checkEmail(email)) throw new ServerError(400, "Invalid Email Address");
        this._email = email;
        this.c_email = true;
    }

    public set password(password: string) {
        if (!checkPassword(password)) throw new ServerError(400, "Invalid Password");
        this._password = password;
    }

    public get password_hash() {
        return this._password_hash;
    }

    public get verified() {
        return this._verified;
    }

    public set verified(verified: boolean) {
        this._verified = verified;
        this.c_verified = true;
    }

    public get user_info() {
        return this._user_info;
    }

    public get admin() {
        return this.permissions.values[Database.dashboard_id]?.includes('admin') ?? false;
    }

    private constructor(user_id: string, username: string, email: string, password: string|undefined, password_hash: string|undefined, verified: boolean, user_info: UserInfo, permissions: Permissions, create: boolean = false) {
        this.permissions = permissions;

        this._user_id = user_id;
        this._username = username;
        this._email = email;
        this._password = password;
        this._password_hash = password_hash;
        this._verified = verified;
        this._user_info = user_info;

        this.create = create;
        this.c_username = create;
        this.c_email = create;
        this.c_verified = create;
        this.c_user_info = create ? {} : {...this._user_info};
    }

    public static async create(username: string, email: string, password: string, user_info: UserInfo): Promise<User> {
        if (!checkEmail(email)) throw new ServerError(400, "Invalid Email Address");
        if (!checkPassword(password)) throw new ServerError(400, "Invalid Password");
        if (!checkUsername(username)) throw new ServerError(400, "Invalid Username");
        let user_id = uuidv4();
        let verified = !ConfigReader.config.email.enabled;

        if (!verified) {
            let verification_code = generateToken(12);
            await Database.insert("verification_code", { user_id, email, verification_code });
            sendVerificationEmail(username, email, verification_code, 0);
        }

        let permissions = await Permissions.fromUserId(user_id);

        return new User(user_id, username, email, password, undefined, verified, user_info, permissions, true);
    }

    public static async fromLogin(login: string): Promise<User> {
        const uuidRegEx = /\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b/;
        const emailRegEx = /^\S+@\S+\.\S+$/;

        let type: string;
        if (uuidRegEx.test(login))
            type = 'user_id';
        else if (emailRegEx.test(login))
            type = 'email';
        else
            type = 'username';

        let user_tuple: UserTuple|undefined = await Database.select<UserTuple>('user', `${type} = '${login}'`);
        if (user_tuple === undefined)
            throw new ServerError(404, `User ${login} not found`);

        let user_infos: UserInfoTuple[] = await Database.selectAll<UserInfoTuple>('user_info', `user_id = '${user_tuple.user_id}'`);
        let user_info: UserInfo = {};
        user_infos.forEach(tuple => user_info[tuple.name] = tuple.value);

        return new User(user_tuple.user_id, user_tuple.username, user_tuple.email, undefined, user_tuple.password_hash, user_tuple.verified, user_info, await Permissions.fromUserId(user_tuple.user_id), false);
    }

    public static async fromLoginPassword(login: string, password: string): Promise<User> {
        let user = await User.fromLogin(login);

        let authorized = await bcrypt.compare(password, user.password_hash as string);
        if (!authorized)
            throw new ServerError(403, "Invalid user credentials");

        return user;
    }

    public async save() {
        try {
            let data: any = {};
            if (this.c_username) data.username = this._username;
            if (this.c_email) data.email = this._email;
            if (this.c_verified) data.verified = this._verified;
            if (this._password) data.password_hash = await bcrypt.hash(this._password, 12);

            if (this.create)
                await Database.insert("user", { user_id: this._user_id, ...data });
            else
                await Database.update("user", `user_id = '${this._user_id}'`, data)

            this.c_username = false;
            this.c_email = false;
            this.c_verified = false;
            this._password = undefined;
            this.create = false;

            for (let key in this._user_info) {
                if (this._user_info[key] === this.c_user_info[key])
                    continue;
                let row: UserInfoTuple = { user_id: this.user_id, name: key, value: this._user_info[key] };
                if (this.c_user_info.hasOwnProperty(key))
                    await Database.update("user_info", `user_id = '${this.user_id}'`, row);
                else
                    await Database.insert("user_info", row);
            }

            this.c_user_info = {...this._user_info};
        } catch(err) {
            if (err instanceof DBError && err.type === DBErrorType.DUPLICATE)
                throw new ServerError(409, "User already exists");
            throw new ServerError(500, "Internal Server Error");
        }

        await this.permissions.save();
    }

    public async delete() {
        await Database.delete('authorization_code', `user_id = '${this._user_id}'`);
        await Database.delete('access_token', `user_id = '${this._user_id}'`);
        await Database.delete('refresh_token', `user_id = '${this._user_id}'`);
        await Database.delete('user', `user_id = '${this._user_id}'`);
        await Database.delete('verification_code', `user_id = '${this._user_id}'`);
        await Database.delete('user_info', `user_id = '${this._user_id}'`);
        this.c_username = false;
        this.c_email = false;
        this.c_verified = false;
        this._password = undefined;
        this.create = true;
    }

    public export(client_id: string): UserExport {
        return {
            user_id: this._user_id,
            username: this._username,
            email: this._email,
            verified: this._verified,
            admin: this.admin,
            permissions: this.permissions.export(client_id),
            ...this._user_info
        };
    }
}
