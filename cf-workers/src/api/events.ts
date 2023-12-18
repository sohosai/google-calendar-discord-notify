import { Hono } from "hono";
import { env } from "hono/adapter";

import type { GuildScheduledEvent } from "common/discord";
import { DiscordBot } from "../lib/discord";

const events = new Hono();

events.post("/:id/scheduled-events", async (c) => {
    const guildId = c.req.param("id");
    const body = await c.req.json<{ data: GuildScheduledEvent }>();
    const { DISCORD_BOT_TOKEN } = env<{ DISCORD_BOT_TOKEN: string }>(c);
    const bot = new DiscordBot(DISCORD_BOT_TOKEN, guildId);

    const res = await bot.postAPI(`/guilds/${guildId}/scheduled-events`, body.data);
    return c.json(res.response, res.status);
});

export { events };
