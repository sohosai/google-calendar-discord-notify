import type { GuildScheduledEvent, GuildScheduledEventModify } from "common/discord";

function main() {
    const WORKERS_TOKEN = getProperty("WORKERS_TOKEN");
    const calendarId = getProperty("calendarId");
    const guildId = getProperty("guildId");

    const syncToken = getProperty("nextSyncToken");
    const data = JSON.parse(getProperty("eventsData") || "{}") as { [k in string]: string };

    const bot = new DiscordBot(WORKERS_TOKEN, guildId);

    const events = getNewEvents(calendarId, syncToken);
    events?.forEach((event) => {
        const location = validateLocation(event.location);
        const startTime = event.start?.dateTime || (event.start?.date ? `${event.start?.date}T00:00:00+09:00` : null);
        const endTime = event.end?.dateTime || (event.end?.date ? `${event.end?.date}T00:00:00+09:00` : null);
        const description =
            (event.htmlLink && `[Google Calendarでイベントを見る](${event.htmlLink})\n\n`) +
            convertDescription(event.description ?? "");

        if (!event.id) {
            console.error("Can't get the event id");
            return;
        }

        if (!(startTime && endTime)) {
            console.error("Can't get start time or end time from a calendar");
            return;
        }

        if (!data[event.id]) {
            // 既になければ新規作成
            const result = bot.createGuildScheduledEvent(
                event.summary || "名称未定",
                location,
                startTime,
                endTime,
                description,
            );
            if (result.error) {
                console.error("Can't create an event");
                return;
            } else {
                const id = result.response.id;
                if (typeof id === "string") {
                    data[event.id] = id;
                    setProperty("eventsData", JSON.stringify(data));
                } else {
                    console.error("Malformed response from discord");
                    return;
                }
            }
        } else {
            // 既にあるなら編集
            const result = bot.modifyGuildScheduledEvent(
                data[event.id],
                event.summary || "名称未定",
                location,
                startTime,
                endTime,
                description,
            );
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

function validateLocation(location?: string) {
    const MAX_LOCATION_LENGTH = 100 - 1;

    const loc = location || "場所未定";
    // MAX_LOCATION_LENGTH 以下になるようにlocationを加工
    const locationLength = [...loc].length; // Discordのカウントの仕様がよく分からないしこれでいいや
    return locationLength <= MAX_LOCATION_LENGTH ? loc : `${loc.substring(0, MAX_LOCATION_LENGTH)}…`;
}

function convertDescription(description: string): string {
    // まずリストを変換
    let markdown = description.replace(/<br>\s*- /gi, "<br>\\- ").replace(/<br>\s*(\d+)\. /gi, "<br>$1\\. ");
    /<ul>(.+?)<\/ul>/gi
        .exec(markdown)
        ?.slice(1)
        .forEach((ul) => (markdown = markdown.replace(ul, ul.replace(/<li>(.+?)(?:<br>)*<\/li>/gi, "- $1\n"))));
    /<ol>(.+?)<\/ol>/gi
        .exec(markdown)
        ?.slice(1)
        .forEach((ol) => (markdown = markdown.replace(ol, ol.replace(/<li>(.+?)(?:<br>)*<\/li>/gi, "1. $1\n"))));
    markdown = markdown.replace(/<ul>|<ol>/gi, "").replace(/<\/ul>|<\/ol>/gi, "\n");

    markdown = markdown
        .replace(/\*/gi, "\\*")
        .replace(/_/gi, "\\_")
        .replace(/\(/gi, "\\(")
        .replace(/\)/gi, "\\)")
        .replace(/\[/gi, "\\[")
        .replace(/\]/gi, "\\]")
        .replace(/<b>|<\/b>/gi, "**")
        .replace(/<i>|<\/i>/gi, "_")
        .replace(/<u>|<\/u>/gi, "__")
        .replace(/<br>/gi, "\n\n")
        .replace(/<a href="(.+?)">(.+?)<\/a>/gi, "[$2]($1)");

    return markdown;
}

class DiscordBot {
    static _apiRoot: string = getProperty("apiRoot");
    _token: string = "";
    guildId: string = "";

    constructor(botToken: string, guildId: string) {
        this._token = botToken;
        this.guildId = guildId;
    }

    _callAPI(
        endpoint: string,
        method: GoogleAppsScript.URL_Fetch.HttpMethod,
        body?: object,
    ):
        | {
              response: any;
              status: number;
              error: false;
          }
        | { error: true } {
        let res: GoogleAppsScript.URL_Fetch.HTTPResponse;
        try {
            if (["post", "put", "patch"].includes(method)) {
                res = UrlFetchApp.fetch(`${DiscordBot._apiRoot}${endpoint}`, {
                    method: method,
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${this._token}`,
                    },
                    payload: JSON.stringify(body),
                });
            } else {
                res = UrlFetchApp.fetch(`${DiscordBot._apiRoot}${endpoint}`, {
                    method: method,
                    headers: {
                        Authorization: `Bearer ${this._token}`,
                    },
                });
            }
        } catch (e) {
            console.error(e);
            return { error: true };
        }

        const json = JSON.parse(res.getContentText());
        const code = res.getResponseCode();
        return { response: json, status: code, error: false };
    }

    createGuildScheduledEvent(
        name: string,
        location: string,
        start_time: ISO8601,
        end_time: ISO8601,
        description?: string,
    ) {
        const body: GuildScheduledEvent = {
            entity_metadata: { location: location },
            name: name,
            privacy_level: 2, //GUILD_ONLY
            scheduled_start_time: start_time,
            scheduled_end_time: end_time,
            description: description,
            entity_type: 3, //EXTERNAL
        };
        return this._callAPI(`/guilds/${this.guildId}/scheduled-events`, "post", body);
    }

    modifyGuildScheduledEvent(
        discordEventId: string,
        name: string,
        location: string,
        start_time: ISO8601,
        end_time: ISO8601,
        description?: string,
    ) {
        const body: GuildScheduledEventModify = {
            entity_metadata: { location: location },
            name: name,
            scheduled_start_time: start_time,
            scheduled_end_time: end_time,
            description: description,
        };
        return this._callAPI(`/guilds/${this.guildId}/scheduled-events/${discordEventId}`, "patch", body);
    }
}

type ISO8601 = string;
