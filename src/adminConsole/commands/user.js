const { createUser, deleteUser, changeUsername, changeEmail, changePassword, getUserId, getUserInfo } = require("../../api/services/user.service");
const DBInterface = require("../../DBInterface");
const dbInterface = new DBInterface();

module.exports.run = async args => {
    switch (args[0]) {
        case "list": {
            try {
                let results = await dbInterface.query("SELECT user_id, username, email, verified FROM user");
                if (results.length === 0) {
                    console.log("There are no users");
                } else {
                    let output = "";
                    await results.forEach(user => {
                        output += `id: ${user.user_id} name: ${user.username} email: ${user.email} verified: ${user.verified}\n`;
                    });
                    console.log(output.substring(0, output.length - 1));
                }
            } catch (e) {
                console.error(e);
            }
            break;
        }
        case "add": {
            args.shift();
            try {
                if (args.length === 3) {
                    let user_id = await createUser(args[0], args[1], args[2]);
                    console.log(`Created user with email: ${args[0]}, username: ${args[1]}, user_id: ${user_id}`);
                } else {
                    console.log("Usage: user add <email> <username> <password>");
                }
            } catch (e) {
                if (e === 400)
                    console.log("Invalid email address");
                else
                    console.error(e);
            }
            break;
        }
        case "remove": {
            args.shift();
            for (const login of args) {
                try {
                    await getUserId(login, async user_id => {
                        await deleteUser(user_id);
                        console.log(`Deleted user ${user_id}`);
                    });
                } catch (e) {
                    console.log(e);
                }
            }
            break;
        }
        case "get": {
            args.shift();
            try {
                if (args.length === 0) {
                    console.log("Usage: user get <email, username or user ID>");
                } else {
                    await getUserId(args[0], async user_id => {
                        let user = await getUserInfo(user_id);
                        let output = "";
                        for (const key in user) {
                            output += `${key}: ${user[key]} `;
                        }
                        console.log(output);
                    });
                }
            } catch (e) {
                console.error(e);
            }
            break;
        }
        case "edit": {
            args.shift();
            try {
                if (args.length < 3 || !(args[1] === "username" || args[1] === "password" || args[1] === "email" || args[1] === "verified")) {
                    console.log("Usage: user edit <email, username or user ID> username/password/email/verified <new value>");
                } else {
                    await getUserId(args[0], async user_id => {
                        switch (args[1]) {
                            case "username":
                                await changeUsername(user_id, args[2]);
                                break;
                            case "password":
                                await changePassword(user_id, args[2]);
                                break;
                            case "email":
                                await changeEmail(user_id, args[2]);
                                break;
                            case "verified":
                                if (["0", "1", "false", "true"].includes(args[2]))
                                    await dbInterface.query(`UPDATE user SET verified = ${args[2]} WHERE user_id = '${user_id}'`);
                                else
                                    console.log("Invalid value: " + args[2]);
                        }
                    });
                }
            } catch (e) {
                console.error(e);
            }
            break;
        }
        default: {
            console.log(
                `Usage: user <command> [<args>]

Commands:
    list    list all users
    add     add user
    remove  remove user
    get     get information of a specific user
    edit    edit username, email or password`
            );
        }
    }
}