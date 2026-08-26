// Import Cognito libraries
import {
    CognitoUserPool,
    CognitoUser,
    AuthenticationDetails,
} from "amazon-cognito-identity-js";

// ✅ Your Cognito pool data
const poolData = {
    UserPoolId: "ap-south-1_a4CWKGPvR",
    ClientId: "4it3r2nsl16upibofjo9rf10ba",
};

const userPool = new CognitoUserPool(poolData);

// ✅ Signup Function
export function signUp(username, password, phone) {
    const attributes = [
        { Name: "phone_number", Value: `+91${phone}` },
        { Name: "preferred_username", Value: username },
    ];

    return new Promise((resolve, reject) => {
        userPool.signUp(username, password, attributes, null, (err, result) => {
            if (err) return reject(err);
            resolve(result.user);
        });
    });
}

export function login(username, password) {
    const email = username.trim().toLowerCase();

    const user = new CognitoUser({
        Username: email,
        Pool: userPool
    });

    const authDetails = new AuthenticationDetails({
        Username: email,
        Password: password
    });

    return new Promise((resolve, reject) => {

        user.authenticateUser(authDetails, {

            onSuccess: (session) => {

                console.log("✅ COGNITO LOGIN SUCCESS");

                resolve({
                    user,
                    idToken: session.getIdToken().getJwtToken(),
                    accessToken: session.getAccessToken().getJwtToken(),
                    refreshToken: session.getRefreshToken().getToken()
                });
            },

            onFailure: (err) => {

                console.error(
                    "❌ Cognito login failed"
                );

                console.error("Code:", err?.code);
                console.error("Message:", err?.message);

                reject(err);
            },

            newPasswordRequired: () => {

                reject({
                    code: "NewPasswordRequired",
                    message: "New password is required."
                });

            }
        });
    });
}