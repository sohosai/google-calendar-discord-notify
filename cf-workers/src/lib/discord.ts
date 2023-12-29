const BOT_URL = "https://github.com/sohosai/google-calendar-discord-notify";
const BOT_VERSION = "1.0.0";

export class DiscordBot {
    static _apiRoot: string = "https://discord.com/api/v10";
    _token: string = "";

    constructor(botToken: string) {
        this._token = botToken;
    }

    async callAPI(
        endpoint: string,
        method: HttpMethod,
        body: object,
    ): Promise<{ response: unknown; status: number; error: false } | { error: true }> {
        let res: Response;
        try {
            if (["POST", "PUT", "PATCH"].includes(method)) {
                res = await fetch(`${DiscordBot._apiRoot}${endpoint}`, {
                    method: method,
                    headers: {
                        "Content-Type": "application/json",
                        "User-Agent": `DiscordBot (${BOT_URL}, ${BOT_VERSION})`,
                        Authorization: `Bot ${this._token}`,
                    },
                    body: JSON.stringify(body),
                });
            } else {
                res = await fetch(`${DiscordBot._apiRoot}${endpoint}`, {
                    method: method,
                    headers: {
                        "User-Agent": `DiscordBot (${BOT_URL}, ${BOT_VERSION})`,
                        Authorization: `Bot ${this._token}`,
                    },
                });
            }
        } catch (e) {
            console.error(e);
            return { error: true };
        }

        if (!res.ok) {
            console.error(res);
            return { error: true };
        }
        const json = await res.json();
        const code = res.status;
        return { response: json, status: code, error: false };
    }
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
