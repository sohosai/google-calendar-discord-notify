import type { GuildScheduledEvent, GuildScheduledEventModify } from "common/discord";

type TriggerData = { time: string; id: string; ct: duration };

const NOTIFICATION_TIMING: duration[] = ["1d"] as const; // 通知のタイミング。「<数字>d」もしくは「<数字>h」の形式の文字列の配列

function main() {
    const WORKERS_TOKEN = getProperty("WORKERS_TOKEN");
    const calendarId = getProperty("calendarId");
    const guildId = getProperty("guildId");
    const notifyChannelId = getProperty("notifyChannelId");

    const syncToken = getProperty("nextSyncToken");
    const data = JSON.parse(getProperty("eventsData") || "{}") as { [k in string]: string };

    const bot = new DiscordBot(WORKERS_TOKEN, guildId, notifyChannelId);
    const triggerHandler = new TriggerHandler("triggersData");

    const events = getNewEvents(calendarId, syncToken);
    events?.forEach((event) => {
        const location = validateLocation(event.location);
        const startTime = event.start?.dateTime || (event.start?.date ? `${event.start?.date}T00:00:00+09:00` : null);
        const endTime = event.end?.dateTime || (event.end?.date ? `${event.end?.date}T00:00:00+09:00` : null);
        const description =
            (event.htmlLink ? `[Google Calendarでイベントを見る](${event.htmlLink})\n\n` : "") +
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
            const now = new Date();
            const startTimeDate = new Date(startTime);
            if (now > startTimeDate) {
                bot.sendMessage(
                    "Google Calendarに予定が作成されましたが、過去の予定であるためDiscordのイベントは作成しません\n" +
                        (event.htmlLink ? `[Google Calendarでイベントを見る](${event.htmlLink})\n\n` : ""),
                );
                return;
            }
            const result = bot.createGuildScheduledEvent(
                event.summary || "名称未定",
                location,
                startTime,
                endTime,
                description,
            );
            if (result.error) {
                console.error("Can't create an event");
                bot.sendMessage(
                    "Google Calendarに予定が作成されましたが、Discordのイベントの作成に失敗しました\n" +
                        (event.htmlLink ? `[Google Calendarでイベントを見る](${event.htmlLink})\n\n` : ""),
                );

                return;
            }

            const id = result.response.id;
            if (typeof id !== "string") {
                console.error("Malformed response from discord");
                return;
            }

            data[event.id] = id;
            setProperty("eventsData", JSON.stringify(data));
            const triggers: TriggerData[] = NOTIFICATION_TIMING.map((d) => ({
                time: TriggerHandler.getDateBefore(startTime, d),
                id: id,
                ct: d,
            }));
            triggerHandler.addTriggers(triggers);

            triggerHandler.setLatestTrigger("notify");

            const message =
                `新しい予定がGoogle Calendarに作成されました\n` +
                (result.response.guild_id && result.response.id
                    ? `https://discord.com/events/${result.response.guild_id}/${result.response.id}`
                    : "");
            bot.sendMessage(message);
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

            if (result.error) {
                console.error("Can't modify a guild event");
                bot.sendMessage(
                    "Google Calendarの予定が編集されましたが、Discordのイベントの更新に失敗しました。\n" +
                        "既に終了した予定を編集していませんか？\n" +
                        +(event.htmlLink ? `[Google Calendarでイベントを見る](${event.htmlLink})\n\n` : ""),
                );
                return;
            }

            const id = result.response.id;
            if (typeof id !== "string") {
                console.error("Malformed response from discord");
                return;
            }

            triggerHandler.deleteTriggers([id]);
            const newTriggers: TriggerData[] = NOTIFICATION_TIMING.map((d) => ({
                time: TriggerHandler.getDateBefore(startTime, d),
                id: id,
                ct: d,
            }));
            triggerHandler.addTriggers(newTriggers);

            triggerHandler.setLatestTrigger("notify");

            const message =
                `Google Calendarの予定の内容が編集されました\n` +
                (result.response.guild_id && id ? `https://discord.com/events/${result.response.guild_id}/${id}` : "");
            bot.sendMessage(message);
        }
    });
}

function notify() {
    const WORKERS_TOKEN = getProperty("WORKERS_TOKEN");
    const guildId = getProperty("guildId");
    const notifyChannelId = getProperty("notifyChannelId");

    const triggers = JSON.parse(getProperty("triggersData") || "[]") as TriggerData[];

    const bot = new DiscordBot(WORKERS_TOKEN, guildId, notifyChannelId);

    const now = new Date();

    deleteAllTriggers();
    try {
        for (const t of triggers) {
            const triggerTime = new Date(t.time);
            if (triggerTime.getTime() - now.getTime() <= 15 * 60 * 1000) {
                triggers.shift();

                const before = t.ct.replace("d", "日").replace("h", "時間");
                const message =
                    `${before}後にイベントがあります\n` +
                    (guildId && t.id
                        ? `https://discord.com/events/${guildId}/${t.id}`
                        : "詳細情報の取得に失敗しました");

                bot.sendMessage(message);
            } else {
                break;
            }
        }
        setProperty("triggersData", JSON.stringify(triggers));
    } finally {
        setTrigger(triggers[0].time, "notify");
    }
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

function getProperty(key: string): string {
    const properties = PropertiesService.getScriptProperties();
    return properties.getProperty(key) ?? "";
}

function setProperty(key: string, value: string): GoogleAppsScript.Properties.Properties {
    const properties = PropertiesService.getScriptProperties();
    return properties.setProperty(key, value);
}

function setTrigger(dateTime: ISO8601, functionName: string) {
    const date = new Date(dateTime);
    return ScriptApp.newTrigger(functionName).timeBased().at(date).create();
}
main;

function deleteAllTriggers() {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach((trigger) => {
        if (trigger.getEventType() == ScriptApp.EventType.CLOCK) {
            ScriptApp.deleteTrigger(trigger);
        }
    });
}

class DiscordBot {
    static _apiRoot: string = getProperty("apiRoot");
    _token: string = "";
    guildId: string = "";
    channelId: string = "";

    constructor(botToken: string, guildId: string, notifyChannelId: string) {
        this._token = botToken;
        this.guildId = guildId;
        this.channelId = notifyChannelId;
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

    sendMessage(content: string) {
        const body = {
            content: content,
            tts: false,
        };

        return this._callAPI(`/channels/${this.channelId}/messages`, "post", body);
    }
}

class TriggerHandler {
    _propertyName = "";
    _triggersData: TriggerData[] = [];

    constructor(propertyName: string) {
        this._propertyName = propertyName;
        this._triggersData = JSON.parse(getProperty(propertyName) || "[]") as TriggerData[];
    }

    static getDateBefore(base: ISO8601, diff: duration): ISO8601 {
        const date = new Date(base);
        if (diff.includes("h")) {
            date.setHours(date.getHours() - parseInt(diff));
        } else if (diff.includes("d")) {
            date.setDate(date.getDate() - parseInt(diff));
        }
        return date.toISOString();
    }
    addTriggers(newTriggers: TriggerData[]) {
        const now = new Date();
        for (const t of newTriggers) {
            const tDate = new Date(t.time);
            if (now < tDate) {
                this._triggersData.push(t);
            }
        }
        this._triggersData.sort((a, b) => (a.time <= b.time ? -1 : 1));
        setProperty(this._propertyName, JSON.stringify(this._triggersData));
    }

    deleteTriggers(ids: string[]) {
        this._triggersData = this._triggersData.filter((t) => ids.every((id) => t.id !== id));
        setProperty(this._propertyName, JSON.stringify(this._triggersData));
    }

    setLatestTrigger(functionName: string) {
        deleteAllTriggers();
        setTrigger(this._triggersData[0].time, functionName);
    }
}

type ISO8601 = string;

type duration = `${number}d` | `${number}h`;
