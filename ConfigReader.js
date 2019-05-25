class ConfigReader {
    constructor(path = "./config") {
        this.config = require(path);
    }

    mysqlConfig() {
        return this.config.mysql;
    }

    port() {
        return this.config.port;
    }

    accessTokenLength() {
        return this.config.accessTokenLength;
    }

    refreshTokenLength() {
        return this.config.refreshTokenLength;
    }

    emailDomain() {
        return this.config.emailDomain;
    }

    dashboardUri() {
        return this.config.dashboard.redirectUri;
    }

    dashboardId() {
        return this.config.dashboard.clientId;
    }

    dashboardSecret() {
        return this.config.dashboard.clientSecret;
    }

    /**
     * Get the time it takes until an access token expires in seconds
     */
    accessTokenExpirationTime() {
        return this.config.accessTokenExpirationTime;
    }
}

module.exports = new ConfigReader("./config");