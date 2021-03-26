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
    email?: string;
    change_password: boolean;
}

export interface UserInfoTuple extends TableRow {
    user_id: string;
    name: string;
    value: string;
}

export enum TableDataTypes {
    TEXT,
    INTEGER,
    BOOLEAN
}

export interface TableRowSchema {
    type: TableDataTypes;
    options: string;
    primary?: boolean;
    unique?: boolean;
}

export interface TableSchema {
    [name: string]: TableRowSchema;
}

const tables: {[table: string]: TableSchema} = {
    client:  {
        client_id: {
            type: TableDataTypes.TEXT,
            options: "NOT NULL",
            primary: true
        },
        client_secret: {
            type: TableDataTypes.TEXT,
            options: "NOT NULL"
        },
        name: {
            type: TableDataTypes.TEXT,
            options: "NOT NULL",
            unique: true
        },
        dev_id: {
            type: TableDataTypes.TEXT,
            options: "NOT NULL"
        }
    },

    user: {
        user_id: {
            type: TableDataTypes.TEXT,
            options: "NOT NULL",
            primary: true
        },
        username: {
            type: TableDataTypes.TEXT,
            options: "NOT NULL"
        },
        email: {
            type: TableDataTypes.TEXT,
            options: "NOT NULL",
            unique: true
        },
        password_hash: {
            type: TableDataTypes.TEXT,
            options: "NOT NULL"
        },
        verified: {
            type: TableDataTypes.BOOLEAN,
            options: "NOT NULL DEFAULT FALSE"
        }
    },

    authorization_code: {
        authorization_code: {
            type: TableDataTypes.TEXT,
            options: "NOT NULL",
            primary: true
        },
        user_id: {
            type: TableDataTypes.TEXT,
            options: "NOT NULL"
        },
        client_id: {
            type: TableDataTypes.TEXT,
            options: "NOT NULL"
        },
        expires: {
            type: TableDataTypes.INTEGER,
            options: "NOT NULL"
        },
        challenge: {
            type: TableDataTypes.TEXT,
            options: "NOT NULL"
        }
    },

    access_token: {
        access_token: {
            type: TableDataTypes.TEXT,
            options: "NOT NULL",
            primary: true
        },
        user_id: {
            type: TableDataTypes.TEXT,
            options: "NOT NULL"
        },
        client_id: {
            type: TableDataTypes.TEXT,
            options: "NOT NULL"
        },
        expires: {
            type: TableDataTypes.INTEGER,
            options: ""
        }
    },

    refresh_token: {
        refresh_token: {
            type: TableDataTypes.TEXT,
            options: "NOT NULL",
            primary: true
        },
        user_id: {
            type: TableDataTypes.TEXT,
            options: "NOT NULL"
        },
        client_id: {
            type: TableDataTypes.TEXT,
            options: "NOT NULL"
        },
        expires: {
            type: TableDataTypes.INTEGER,
            options: "NOT NULL"
        }
    },

    permissions: {
        user_id: {
            type: TableDataTypes.TEXT,
            options: "NOT NULL",
            primary: true
        },
        client_id: {
            type: TableDataTypes.TEXT,
            options: "NOT NULL",
            primary: true
        },
        permission: {
            type: TableDataTypes.TEXT,
            options: "NOT NULL",
            primary: true
        }
    },

    redirect_uri: {
        client_id: {
            type: TableDataTypes.TEXT,
            options: "NOT NULL",
            primary: true
        },
        redirect_uri: {
            type: TableDataTypes.TEXT,
            options: "NOT NULL",
            primary: true
        }
    },

    verification_code: {
        verification_code: {
            type: TableDataTypes.TEXT,
            options: "NOT NULL",
            primary: true
        },
        user_id: {
            type: TableDataTypes.TEXT,
            options: "NOT NULL",
            primary: true
        },
        email: {
            type: TableDataTypes.TEXT,
            options: ""
        },
        change_password: {
            type: TableDataTypes.BOOLEAN,
            options: "NOT NULL DEFAULT FALSE"
        }
    },

    user_info: {
        user_id: {
            type: TableDataTypes.TEXT,
            options: "NOT NULL",
            primary: true
        },
        name: {
            type: TableDataTypes.TEXT,
            options: "NOT NULL",
            primary: true
        },
        value: {
            type: TableDataTypes.TEXT,
            options: "NOT NULL"
        }
    },
}

export { tables }
