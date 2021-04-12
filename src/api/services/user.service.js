const { Database } = require("../../db/Database");

/**
 * Get all users. admin only
 */
exports.getAllUsers = async () => {
    let results = await Database.query(`SELECT user.user_id AS user_id, user.username AS username, user.email AS email, user.verified AS verified, admins.permission AS permission FROM user LEFT JOIN (SELECT * FROM permissions WHERE client_id = '${Database.dashboard_id}' AND permission = 'admin') admins ON user.user_id = admins.user_id`);
    let users = [];
    await results.forEach(user => {
        users.push({
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            verified: user.verified === 1,
            admin: user.permission === "admin"
        });
    });
    return users;
}
