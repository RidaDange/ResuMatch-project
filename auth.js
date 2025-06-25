// Import Cognito libraries
import {
    CognitoUserPool,
    CognitoUser,
    AuthenticationDetails,
} from "amazon-cognito-identity-js";

// ✅ Your Cognito pool data
const poolData = {
    UserPoolId: "ap-south-1_MsnsL6Wxh",
    ClientId: "1htcd9u5v0pt1ggfgp6qkdkf22",
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

// ✅ Login Function
export function login(username, password) {
    const user = new CognitoUser({ Username: username, Pool: userPool });
    const authDetails = new AuthenticationDetails({ Username: username, Password: password });

    return new Promise((resolve, reject) => {
        user.authenticateUser(authDetails, {
            onSuccess: (session) => {
                const token = session.getIdToken().getJwtToken();
                resolve({ user, token });
            },
            onFailure: reject,
        });
    });
}
