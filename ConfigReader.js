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

    /**
     * Get the time it takes until an access token expires in seconds
     */
    accessTokenExpirationTime() {
        return this.config.accessTokenExpirationTime;
    }
}

module.exports = new ConfigReader("./config");