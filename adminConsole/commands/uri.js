module.exports.run = async args => {
    switch (args[0]) {
        case "list": {
            //TODO
            break;
        }
        case "add": {
            //TODO
            break;
        }
        case "remove": {
            //TODO
            break;
        }
        default: {
            console.log(
`Usage: uri <command> [<args>]

Commands:
    list    list all redirect URIs of all clients
    add     add a new redirect URI for a client
    remove  remove a redirect URI`
            );
        }
    }
}