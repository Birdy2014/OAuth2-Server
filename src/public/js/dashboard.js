function navigate(tab) {
    let tabs = document.getElementsByClassName("active");
    for (let tab of tabs) {
        tab.classList.remove("active");
    }
    document.getElementById(tab).classList.add("active");
}

/**
 * Logs in and saves the refresh_token to the localStorage
 * @returns {string} access_token
 */
async function login() {
    if (window.localStorage.getItem("refresh_token")) {
        try {
            return await refreshToken(window.localStorage.getItem("refresh_token"));
        } catch (e) {
            window.localStorage.removeItem("refresh_token");
            window.localStorage.removeItem("client_id");
            return await login();
        }
    }
    let client_id = await getDashboardId();
    let authorization_code = url.searchParams.get("authorization_code");
    let state = url.searchParams.get("state");
    if (authorization_code && state === window.sessionStorage.getItem("state")) {
        //Get tokens
        let tokens = JSON.parse(await request(`${url.protocol}//${url.host}/api/token`, "POST", `grant_type=authorization_code&client_id=${client_id}&authorization_code=${authorization_code}`));
        window.localStorage.setItem("refresh_token", tokens.data.refresh_token);
        window.localStorage.setItem("client_id", client_id);
        window.history.replaceState({}, document.title, "/dashboard");
        return tokens.access_token;
    } else {
        //Redirect to Login
        state = Math.random().toString(36).substring(7);
        window.sessionStorage.setItem("state", state);
        window.location.href = `${url.protocol}//${url.host}/authorize?client_id=${client_id}&redirect_uri=${url}&state=${state}`;
    }
}

async function refreshToken(refresh_token) {
    let tokens = JSON.parse(await request(`${url.protocol}//${url.host}/api/token`, "POST", `grant_type=refresh_token&client_id=${window.localStorage.getItem("client_id")}&refresh_token=${refresh_token}`));
    return tokens.data.access_token;
}

async function loadData(access_token) {
    try {
        //Get connected clients, user information, permissions
        let { user_id, username, email, permissions, admin } = JSON.parse(await request(`${url.protocol}//${url.host}/api/dashboard`, "GET", "", access_token)).data;

        //Load data to DOM
        input_username.placeholder = username;
        input_email.placeholder = email;

        //admin settings
        if (admin) document.getElementById("menu_item_admin_settings").style.display = "inline";
        let users = JSON.parse(await request(`${url.protocol}//${url.host}/api/user`, "GET", "", access_token)).data;
        users.forEach(user => {
            let user_element = document.createElement("li");
            user_element.innerHTML = `user_id: ${user.user_id}, username: <input type="text" placeholder="${user.username}" id="input_username_${user.user_id}"/>, email: <input type="email" placeholder="${user.email}" id="input_email_${user.user_id}"/>, Password: <input type="password" id="input_password_${user.user_id}"/>, verified: ${user.verified}, admin: ${user.admin} <a href="javascript:void(0)" onclick="changeSettings(global_access_token, '${user.user_id}', document.getElementById('input_username_${user.user_id}').value, document.getElementById('input_email_${user.user_id}').value, document.getElementById('input_password_${user.user_id}').value)">Submit</a>`;
            user_list.appendChild(user_element);
        });
        let clients = JSON.parse(await request(`${url.protocol}//${url.host}/api/client`, "GET", "", access_token)).data;
        clients.forEach(client => {
            let client_element = document.createElement("li");
            client_element.innerHTML = `client_id: ${client.client_id}, name: ${client.name}, dev_id: ${client.dev_id}`;
            client_list.appendChild(client_element);
        });
    } catch (e) {
        if (JSON.parse(e).status === 403) {
            await loadData(await refreshToken(window.localStorage.getItem("refresh_token")));
        } else {
            console.error(e);
        }
    }
}

async function changeSettings(access_token, user_id, new_username, new_email, new_password) {
    try {
        if (!(new_username || new_email || new_password)) return { status: 400, error: "Input missing" };
        let data = "";
        if (user_id) data += `user_id=${user_id}&`;
        if (new_username) data += `username=${new_username}&`;
        if (new_email) data += `email=${new_email}&`;
        if (new_password) data += `password=${new_password}&`;
        data = data.substring(0, data.length - 1);

        let result = JSON.parse(await request(`${url.protocol}//${url.host}/api/user`, "PUT", data, access_token));
        return result;
    } catch (e) {
        e = JSON.parse(e);
        if (e.status === 403) {
            await changeSettings(await refreshToken(window.localStorage.getItem("refresh_token")), user_id, new_username, new_email, new_password);
        } else {
            console.error(e);
            return e;
        }
    }
}

const url = new URL(window.location);
var global_access_token = "";
var input_username;
var input_email;
var input_password;
var input_confirm_password;
var user_list;
var client_list;
window.onload = () => {
    input_username = document.getElementById("input_username");
    input_email = document.getElementById("input_email");
    input_password = document.getElementById("input_password");
    input_confirm_password = document.getElementById("input_confirm_password");
    user_list = document.getElementById("user_list");
    client_list = document.getElementById("client_list");

    login().then(access_token => { global_access_token = access_token; loadData(access_token) });

    document.getElementById("button_submit").onclick = () => {
        if (input_password.value !== input_confirm_password.value) {
            alert("Passwords don't match");
        } else {
            changeSettings(global_access_token, undefined, input_username.value, input_email.value, input_password.value).then(result => {
                if (result.status === 200) {
                    input_username.value = "";
                    input_email.value = "";
                    input_password.value = "";
                    input_confirm_password.value = "";
                    loadData(global_access_token);
                } else {
                    alert(result.error);
                }
            });
        }
    }
}