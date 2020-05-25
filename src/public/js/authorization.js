let verificationMessageShown = false;

async function getAuthorizationCode(login, password, client_id, redirect_uri, state, code_challenge, code_challenge_method) {
    let domain = window.location.href.replace('http://', '').replace('https://', '').split(/[/?#]/)[0];
    let secure = window.location.href.includes("https://");
    let url = `${secure ? "https://" : "http://"}${domain}/api/authorize`;

    try {
        let body = await request(url, "POST", `login=${login}&password=${password}&client_id=${client_id}&redirect_uri=${redirect_uri}&code_challenge=${code_challenge}&code_challenge_method=${code_challenge_method}`);
        let jsonObj = JSON.parse(body);
        window.location.href = `${redirect_uri}${redirect_uri.includes("?") ? "&" : "?"}authorization_code=${jsonObj.data.authorization_code}${state === null ? "" : "&state=" + state}`;
    } catch (e) {
        let body = JSON.parse(e);
        console.log(e);
        if (body.status === 403 && body.error === "Invalid User credentials")
            alert("Invalid username or password");
        else if (body.status === 403 && body.error === "Invalid Client credentials")
            alert("Invalid client_id or redirect_uri");
        else if (body.status === 400 && body.error === "Email not verified")
            showVerificationMessage(login, password, client_id, redirect_uri, state);
        else
            alert("Unknown error: " + body.status + " " + body.error);
    }
}

function showVerificationMessage(login, password, client_id, redirect_uri, state) {
    verificationMessageShown = true;
    document.getElementById("interactionContainer").innerHTML = "Please verify your email address";
    setInterval((login, password, client_id, redirect_uri, state) => {
        getAuthorizationCode(login, password, client_id, redirect_uri, state);
    }, 3000, login, password, client_id, redirect_uri, state);
}

function submitAuthorization() {
    let login = document.getElementById("usernameInput").value;
    let password = document.getElementById("passwordInput").value;
    let url = new URL(window.location.href);
    let client_id = url.searchParams.get("client_id");
    let state = url.searchParams.get("state");
    let redirect_uri = url.searchParams.get("redirect_uri");
    let code_challenge = url.searchParams.get("code_challenge");
    let code_challenge_method = url.searchParams.get("code_challenge_method");
    if (login && password && client_id && redirect_uri)
        getAuthorizationCode(login, password, client_id, redirect_uri, state, code_challenge, code_challenge_method);
    else
        alert("missing data");
}

async function submitPasswordReset() {
    try {
        let login = document.getElementById("usernameInput").value;
        if (login) {
            let url = new URL(window.location.href);
            let res = await request(`${url.protocol}//${url.host}/api/verification`, "PUT", `login=${login}`);
            alert("Email sent");
        } else {
            alert("Username or email missing");
        }
    } catch (e) {
        if (JSON.parse(e).error === "Invalid Password") {
            alert("Invalid Password");
        } else {
            alert("Error");
            console.error(e);
        }
    }
}

function request(url, method, body, authorization) {
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                resolve(xhr.response);
            } else {
                reject(xhr.response);
            }
        };
        xhr.onerror = function () {
            reject({
                status: this.status,
                statusText: xhr.statusText
            });
        };
        if (body) xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        if (authorization) xhr.setRequestHeader("Authorization", authorization);
        xhr.send(body);
    });
}

function redirect(target) {
    window.location.href = target + window.location.search;    
}
