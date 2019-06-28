# OAuth2 Server
## Description

A simple OAuth2 Server written in JavaScript. It currently supports the authorization code and refresh token grant types.

## Setup
Requirements:

- Node.JS
- A mysql or mariadb server

download source and install dependencies:
```bash
git clone https://github.com/Birdy2014/OAuth2-Server
cd ./OAuth2-Server
npm install
```
Customize the config.json as shown in [Configuration](#Configuration)

Run:
```bash
npm start
```

## Configuration

### Configuration file

You can change the configuration of the server by editing the config.json file.

- mysql: The settings for your mysql or mariadb server
- port: The port on which the server will run
- accessTokenExpirationTime: The time it takes for an access token to expire in seconds
- accessTokenLength: The length of an access token
- refreshTokenLength: The length of a refresh token
- emailWhitelist: Array containing the accepted domains for email addresses. Example: ["example.com", "example.de"]. Leave empty to accept all domains

### Custom websites

TODO

## Usage

### API

See the [REST API Documentation in the wiki](https://github.com/Birdy2014/OAuth2-Server/wiki/REST-API)

### Console

TODO