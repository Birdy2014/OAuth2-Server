export interface TableRow {
    [name: string]: any;
}

export interface ClientTuple extends TableRow {
    client_id: string;
    client_secret: string;
    name: string;
    dev_id: string;
}

export interface UserTuple extends TableRow {
    user_id: string;
    username: string;
    email: string;
    password_hash: string;
    verified: boolean;
}

export interface AuthorizationCodeTuple extends TableRow {
    authorization_code: string;
    user_id: string;
    client_id: string;
    expires: number;
    challenge: string;
}

export interface AccessTokenTuple extends TableRow {
    access_token: string;
    user_id: string;
    client_id: string;
    expires: number;
}

export interface RefreshTokenTuple extends TableRow {
    refresh_token: string;
    user_id: string;
    client_id: string;
    expires: number;
}

export interface PermissionsTuple extends TableRow {
    user_id: string;
    client_id: string;
    permission: string;
}

export interface RedirectUriTuple extends TableRow {
    client_id: string;
    redirect_uri: string;
}

export interface VerificationCodeTuple extends TableRow {
    verification_code: string;
    user_id: string;
    email: string;
    change_password: boolean;
}

export interface UserInfoTuple extends TableRow {
    user_id: string;
    name: string;
    value: string;
}
