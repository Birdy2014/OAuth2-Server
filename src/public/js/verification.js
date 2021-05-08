async function verify() {
    let url = new URL(window.location.href);
    let verification_code = url.searchParams.get("verification_code");

    let container = document.querySelector("#content-container");
    try {
        let res = JSON.parse(await request("/api/verification", "POST", `verification_code=${verification_code}`));
        let email = res.data.email;
        container.innerHTML = `Verified ${email}`;
    } catch (e) {
        container.innerHTML = "Could not verify email address";
        console.error(e);
    }
}

async function resetPassword() {
    let url = new URL(window.location.href);
    let verification_code = url.searchParams.get("verification_code");
    let password = document.getElementById("input_password").value;
    let container = document.querySelector("#content-container");

    try {
        await request('/api/verification', "POST", `verification_code=${verification_code}&password=${password}`);
        container.innerHTML = "Password changed";
    } catch (e) {
        container.innerHTML = "Error: " + e;
        console.error(e);
    }
}
