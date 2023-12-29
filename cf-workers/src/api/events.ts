import { Hono } from "hono";
import { env } from "hono/adapter";

import type { GuildScheduledEvent } from "common/discord";
import { DiscordBot } from "../lib/discord";

const events = new Hono();

events
    .post("/guilds/:guild.id/scheduled-events", async (c) => {
        const guildId = c.req.param("guild.id");
        const body = await c.req.json<GuildScheduledEvent>();

        const { DISCORD_BOT_TOKEN } = env<{ DISCORD_BOT_TOKEN: string }>(c);
        const bot = new DiscordBot(DISCORD_BOT_TOKEN);

        const res = await bot.callAPI(`/guilds/${guildId}/scheduled-events`, "POST", body);
        if (res.error && !(res.response && res.status)) {
            console.error(res.response)
            return new Response(null, { status: 500 });
        } else {
            return c.json(res.response, res.status);
        }
    })
    .patch("/guilds/:guild.id/scheduled-events/:guild_scheduled_event.id", async (c) => {
        const guildId = c.req.param("guild.id");
        const guildScheduledEventId = c.req.param("guild_scheduled_event.id");
        const body = await c.req.json<GuildScheduledEvent>();

        const { DISCORD_BOT_TOKEN } = env<{ DISCORD_BOT_TOKEN: string }>(c);
        const bot = new DiscordBot(DISCORD_BOT_TOKEN);

        const res = await bot.callAPI(`/guilds/${guildId}/scheduled-events/${guildScheduledEventId}`, "PATCH", body);

        if (res.error && !(res.response && res.status)) {
            console.error(res.response)
            return new Response(null, { status: 500 });
        } else {
            return c.json(res.response, res.status);
        }
    });

export { events };
