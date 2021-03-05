const { addPermission, removePermission } = require("../../api/services/permission.service");
const db = require("../../db");
const { getUserId } = require("../util/user");

module.exports.run = async args => {
    switch (args[0]) {
        case "add": {
            args.shift();
            for (const login of args) {
                try {
                    let user_id = await getUserId(login);
                    await addPermission(user_id, await db.getDashboardId(), "admin");
                    console.log(`${user_id} is now admin`);
                } catch (e) {
                    console.error(e);
                }
            }
            break;
        }
        case "list": {
            try {
                let result = await db.query("SELECT permissions.user_id AS user_id, user.email AS email, user.username AS username FROM permissions JOIN user ON permissions.user_id = user.user_id WHERE permission = 'admin'");
                if (result.length === 0) {
                    console.log("There are no admins");
                } else {
                    let admins = "";
                    await result.forEach(admin => {
                        admins += `id: ${admin.user_id} name: ${admin.username} email: ${admin.email}\n`;
                    });
                    console.log(admins.substring(0, admins.length - 1)); //Without last line break
                }
            } catch (e) {
                console.error(e);
            }
        }
        case "remove": {
            args.shift();
            for (const login of args) {
                try {
                    let user_id = await getUserId(login);
                    await removePermission(user_id, await db.getDashboardId(), "admin");
                    console.log(`${user_id} is no admin anymore`);
                } catch (e) {
                    console.error(e);
                }
            }
            break;
        }
        default: {
            console.log(
`Usage: admin <command> [<args>]

Commands:
    list    list all admins
    add     add admin permissions to users
    remove  remove admin permissions from users`
            );
        }
    }
}
