# OAuth2 Server
## Description

## Setup
Dependencies:

- Node.JS
- A mysql or mariadb server

Download and install node.js dependencies:
```bash
git clone https://github.com/Birdy2014/OAuth2-Server
cd ./OAuth2-Server
npm install
```
Customize the config.json as shown in [Configuration](#Configuration)

Run:
```bash
node index.js
```

## Configuration

### Configuration file

You can change the configuration of the server by editing the config.json file.

- mysql: The settings for your mysql or mariadb server
- port: The port on which the server will run
- accessTokenExpirationTime: The time it takes for an access token to expire in seconds
- accessTokenLength: The length of an access token
- refreshTokenLength: The length of a refresh token
- emailDomain: The accepted domain for email addresses. Example: "example.com". Leave empty to accept all domains
- dashboard: The settings for the dashboard client. Change the redirectUri value to fit your Website url

### Custom websites

## Usage

### API

### Console