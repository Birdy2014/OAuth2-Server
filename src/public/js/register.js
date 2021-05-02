async function register(username, email, password, client_id, redirect_uri, state) {
    let domain = window.location.href.replace('http://', '').replace('https://', '').split(/[/?#]/)[0];
    let secure = window.location.href.includes("https://");
    let requestUrl = `${secure ? "https://" : "http://"}${domain}/api/user`;

    try {
        let body = await request(requestUrl, "POST", `username=${username}&email=${email}&password=${password}`);
        let { user_id } = JSON.parse(body).data;
        window.location.href = `${secure ? "https://" : "http://"}${domain}/dashboard`;
    } catch (e) {
        e = JSON.parse(e);
        alert("Error: " + e.error);
    }
}

function submitRegister(event) {
    event.preventDefault();
    let username = document.getElementById("usernameInput").value;
    let email = document.getElementById("emailInput").value;
    let password = document.getElementById("passwordInput").value;
    let passwordVerification = document.getElementById("passwordVerification").value;
    let url = new URL(window.location.href);
    let client_id = url.searchParams.get("client_id");
    let state = url.searchParams.get("state");
    let redirect_uri = url.searchParams.get("redirect_uri");
    let code_challenge = url.searchParams.get("code_challenge");
    let code_challenge_method = url.searchParams.get("code_challenge_method");

    if (!username || !email || !password || !passwordVerification)
        return alert("Please fill in all the information");

    if (password !== passwordVerification)
        return alert("Passwords don't match");

    register(username, email, password, client_id, redirect_uri, state);
}

async function getDashboardId() {
    let domain = window.location.href.replace('http://', '').replace('https://', '').split(/[/?#]/)[0];
    let secure = window.location.href.includes("https://");
    let url = `${secure ? "https://" : "http://"}${domain}/api/dashboard_id`;

    return JSON.parse(await request(url, "GET")).data.client_id;
}
