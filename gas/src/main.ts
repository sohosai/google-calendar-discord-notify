import type { GuildScheduledEvent } from "common/discord";

const BOT_URL = "https://github.com/sohosai/google-calendar-discord-notify";
const BOT_VERSION = "1.0.0";

function main() {
    const DISCORD_BOT_TOKEN = getProperty("DISCORD_BOT_TOKEN");
    const calendarId = getProperty("calendarId");
    const guildId = getProperty("guildId");

    const syncToken = getProperty("nextSyncToken");

    const bot = new DiscordBot(DISCORD_BOT_TOKEN, guildId);

    const events = getNewEvents(calendarId, syncToken);
    events?.forEach((event) => {
        if (event.start?.dateTime && event.end?.dateTime) {
            const result = bot.createGuildScheduledEvent(
                event.summary || "名称未定",
                event.location || "場所未定",
                event.start?.dateTime,
                event.end?.dateTime,
                event.description,
            );
            console.log(result);
        } else if (event.start?.date && event.end?.date) {
            bot.createGuildScheduledEvent(
                event.summary || "名称未定",
                event.location || "場所未定",
                `${event.start?.date}T00:00:00+09:00`,
                `${event.end?.date}T00:00:00+09:00`,
                event.description,
            );
        } else {
        }
    });
}

function getNewEvents(calendarId: string, token?: string): GoogleAppsScript.Calendar.Schema.Event[] | undefined {
    const options = token
        ? {
              syncToken: token,
          }
        : {
              timeMin: new Date().toISOString(),
          };

    let events: GoogleAppsScript.Calendar.Schema.Events | undefined;
    try {
        events = Calendar.Events?.list(calendarId, options);
    } catch (e) {
        console.warn(e);
    }

    if (events && events.nextSyncToken) {
        setProperty("nextSyncToken", events.nextSyncToken);
    }

    const eventList = events?.items;
    if (!eventList || eventList.length === 0) {
        console.info("新しい予定は見つかりませんでした。");
        return;
    }

    return eventList;
}

function getProperty(key: string): string {
    const properties = PropertiesService.getScriptProperties();
    return properties.getProperty(key) ?? "";
}

function setProperty(key: string, value: string): GoogleAppsScript.Properties.Properties {
    const properties = PropertiesService.getScriptProperties();
    return properties.setProperty(key, value);
}

class DiscordBot {
    static _apiRoot: string = "https://discord.com/api/v10";
    _token: string = "";
    guildId: string = "";

    constructor(botToken: string, guildId: string) {
        this._token = botToken;
        this.guildId = guildId;
    }

    _postAPI(endpoint: string, body: object) {
        const res = UrlFetchApp.fetch(`${DiscordBot._apiRoot}${endpoint}`, {
            method: "post",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": `DiscordBot (${BOT_URL}, ${BOT_VERSION})`,
                Authorization: `Bearer ${this._token}`,
            },
            payload: JSON.stringify({ data: body }),
            muteHttpExceptions: true,
        });
        return res.getContentText();
    }

    createGuildScheduledEvent(
        name: string,
        location: string,
        start_time: ISO8601,
        end_time: ISO8601,
        description?: string,
    ) {
        const MAX_LOCATION_LENGTH = 100 - 1;

        // MAX_LOCATION_LENGTH 以下になるようにnameを加工
        const locationLength = [...location].length; // Discordのカウントの仕様がよく分からないしこれでいいや
        const validatedLocation =
            locationLength <= MAX_LOCATION_LENGTH ? location : `${name.substring(0, MAX_LOCATION_LENGTH)}…`;

        const body: GuildScheduledEvent = {
            entity_metadata: { location: validatedLocation },
            name: name,
            privacy_level: 2, //GUILD_ONLY
            scheduled_start_time: start_time,
            scheduled_end_time: end_time,
            description: description,
            entity_type: 3, //EXTERNAL
        };
        return this._postAPI(`/guilds/${this.guildId}/scheduled-events`, body);
    }
}

type ISO8601 = string;
