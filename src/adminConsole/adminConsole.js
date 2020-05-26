const fs = require("fs");
const readline = require("readline");
const path = require("path");
const appDir = path.dirname(require.main.filename);

exports.start = () => {
    const commands = new Map();
    fs.readdir(`${appDir}/adminConsole/commands`, "utf8", (err, files) => {
        if (err) return console.error(err);
        files.forEach(file => {
            if (!file.endsWith(".js")) return;
            const commandName = file.split(".")[0];
            const props = require(`${appDir}/adminConsole/commands/${file}`);
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
        let args = input.match(/(".*?"|[^"\s]+)+(?=\s*|\s*$)/g);
        for (let i = 0; i < args.length; i++) args[i] = args[i].replace(/"/g, "");
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
