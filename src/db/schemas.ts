export interface ClientTuple {
    client_id: string;
    client_secret: string;
    name: string;
    dev_id: string;
}

export interface UserTuple {
    user_id: string;
    username: string;
    email: string;
    password_hash: string;
    verified: boolean;
}

export interface AuthorizationCodeTuple {
    authorization_code: string;
    user_id: string;
    client_id: string;
    expires: number;
    challenge: string;
}

export interface AccessTokenTuple {
    access_token: string;
    user_id: string;
    client_id: string;
    expires: number;
}

export interface RefreshTokenTuple {
    refresh_token: string;
    user_id: string;
    client_id: string;
    expires: number;
}

export interface PermissionsTuple {
    user_id: string;
    client_id: string;
    permission: string;
}

export interface RedirectUriTuple {
    client_id: string;
    redirect_uri: string;
}

export interface VerificationCodeTuple {
    verification_code: string;
    user_id: string;
    email: string;
    change_password: boolean;
}

export interface UserInfoTuple {
    user_id: string;
    name: string;
    value: string;
}
