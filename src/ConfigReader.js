class ConfigReader {
    static instance;

    constructor(path = "../config") {
        if (ConfigReader.instance) return ConfigReader.instance;

        this.config = require(path);

        ConfigReader.instance = this;
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

module.exports = ConfigReader;