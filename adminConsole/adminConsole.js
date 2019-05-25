const fs = require("fs");
const readline = require("readline");

function start() {
    const commands = new Map();
    fs.readdir("./adminConsole/commands", "utf8", (err, files) => {
        if (err) return console.error(err);
        files.forEach(file => {
            if (!file.endsWith(".js")) return;
            const commandName = file.split(".")[0];
            const props = require(`./commands/${file}`);
            commands.set(commandName, props);
        });
    });

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true
    });

    rl.setPrompt("OAuth2-Server>");
    rl.on("line", async input => {
        let args = input.split(" ");
        let command = args.shift();
        let cmd = commands.get(command);
        if (!cmd)
            console.log("Unknown command");
        else
            await cmd.run(args);
        rl.prompt();
    });

    console.log("OAuth2-Server is running. Type in 'help' for help or 'stop' to stop the server.");
    rl.prompt();
}

module.exports.start = start;