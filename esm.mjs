let PWGameClient = (await import("./dist/game/PWGameClient.js")).default;
let PWApiClient = (await import("./dist/api/PWApiClient.js")).default;

if ("default" in PWGameClient) PWGameClient = PWGameClient.default;
if ("default" in PWApiClient) PWApiClient = PWApiClient.default;

const Constants = (await import("./dist/util/Constants.js")).default;

export default {
    PWGameClient, PWApiClient, Constants
};

export {
    PWGameClient, PWApiClient, Constants
};