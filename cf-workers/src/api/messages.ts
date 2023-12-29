import { Hono } from "hono";
import { env } from "hono/adapter";

import { DiscordBot } from "../lib/discord";

const messages = new Hono();

messages.post("/channels/:channel.id/messages", async (c) => {
    const channelId = c.req.param("channel.id");
    const body = await c.req.json();

    const { DISCORD_BOT_TOKEN } = env<{ DISCORD_BOT_TOKEN: string }>(c);
    const bot = new DiscordBot(DISCORD_BOT_TOKEN);

    const res = await bot.callAPI(`/channels/${channelId}/messages`, "POST", body);
    if (res.error && !(res.response && res.status)) {
        console.error(res.response)
        return new Response(null, { status: 500 });
    } else {
        return c.json(res.response, res.status);
    }
});

export { messages };
