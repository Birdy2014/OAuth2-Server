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
        } catch(e) {
            window.localStorage.removeItem("refresh_token");
            window.localStorage.removeItem("client_id");
            return await login();
        }
    }
    let client_id = await getDashboardId();
    let url = window.location;
    let authorization_code = url.searchParams.get("authorization_code");
    let state = url.searchParams.get("state");
    if (authorization_code && state === window.sessionStorage.getItem("state")) {
        //Get tokens
        let tokens = JSON.parse(request(`${url.protocol}//${url.host}/api/token`, "POST", `grant_type=authorization_code&client_id=${client_id}&authorization_code=${authorization_code}`));
        window.localStorage.setItem("refresh_token", tokens.data.refresh_token);
        window.localStorage.setItem("client_id", client_id);
        return tokens.access_token;
    } else {
        //Redirect to Login
        state = Math.random().toString(36).substring(7);
        window.sessionStorage.setItem("state", state);
        window.location.href = `${url.protocol}//${url.host}/authorize?client_id=${client_id}&redirect_uri=${url}&state=${state}`;
    }
}

async function refreshToken(refresh_token) {
    let tokens = JSON.parse(request(`${url.protocol}//${url.host}/api/token`, "POST", `grant_type=refresh_token&client_id=${window.localStorage.get("client_id")}&refresh_token=${refresh_token}`));
    return tokens.data.access_token;
}

async function loadData(access_token) {
    try {
        //Get connected clients, user information, permissions
    } catch(e) {
        if (JSON.parse(e).status === 403) {
            await loadData(await refreshToken(window.localStorage.getItem("refresh_token")));
        } else {
            console.error(e);
        }
    }
}

login().then(access_token => loadData(access_token));