function register(username, email, password) {
    let domain = window.location.href.replace('http://','').replace('https://','').split(/[/?#]/)[0];
    let secure = window.location.href.includes("https://");
    let url = `${secure ? "https://" : "http://"}${domain}/api/user`;

    let xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = () => {
        if (xhttp.readyState === 4 && xhttp.status === 201) {
            let user_id = JSON.parse(xhttp.responseText).data.user_id;
            let url = new URL(window.location.href);
            let client_id = url.searchParams.get("client_id") || "ce48c1b6-2ca6-47f6-ad19-53a7a5d78b08"; //TODO get the dashboard client id from somewhere else
            let state = url.searchParams.get("state");
            let redirect_uri = url.searchParams.get("redirect_uri") || `${secure ? "https://" : "http://"}${domain}/dashboard`;
            getAuthorizationCode(user_id, password, client_id, redirect_uri, state);
        } else if (xhttp.readyState === 4 && xhttp.status === 409) {
            alert("User already exists");
        } else if (xhttp.readyState === 4) {
            alert("Unknown error: " + xhttp.status);
        }
    };
    xhttp.open("POST", url, true);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhttp.send(`username=${username}&email=${email}&password=${password}`);
}

function submitRegister() {
    let username = document.getElementById("usernameInput").value;
    let email = document.getElementById("emailInput").value;
    let password = document.getElementById("passwordInput").value;
    let passwordVerification = document.getElementById("passwordVerification").value;

    if (username && email && password && passwordVerification && password === passwordVerification)
        register(username, email, password);
    else
        alert("Please fill in all the information");
}