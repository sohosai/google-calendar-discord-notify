const BOT_URL = "https://github.com/sohosai/google-calendar-discord-notify";
const BOT_VERSION = "1.0.0";

export class DiscordBot {
    static _apiRoot: string = "https://discord.com/api/v10";
    _token: string = "";
    guildId: string = "";

    constructor(botToken: string, guildId: string) {
        this._token = botToken;
        this.guildId = guildId;
    }

    async postAPI(endpoint: string, body: object) {
        const res = await fetch(`${DiscordBot._apiRoot}${endpoint}`, {
            method: "post",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": `DiscordBot (${BOT_URL}, ${BOT_VERSION})`,
                Authorization: `Bot ${this._token}`,
            },
            body: JSON.stringify(body),
        });
        const json = await res.json();
        const code = res.status;
        return { response: json, status: code };
    }
}
