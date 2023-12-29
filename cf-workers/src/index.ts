import { Hono } from "hono";
import { env } from "hono/adapter";
import { bearerAuth } from "hono/bearer-auth";

import { events } from "./api/events";
import { messages } from "./api/messages";

export interface Env {
    // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
    // MY_KV_NAMESPACE: KVNamespace;
    //
    // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
    // MY_DURABLE_OBJECT: DurableObjectNamespace;
    //
    // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
    // MY_BUCKET: R2Bucket;
    //
    // Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
    // MY_SERVICE: Fetcher;
    //
    // Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
    // MY_QUEUE: Queue;
}

const app = new Hono();

app.use("/api/*", async (c, next) => {
    const { WORKERS_TOKEN } = env<{ WORKERS_TOKEN: string }>(c);
    const auth = bearerAuth({ token: WORKERS_TOKEN });
    await auth(c, next);
});

app.get("/", (c) => c.text("Hello! This is a proxy for Google Apps Script and Discord API."));
app.route("/api", events);
app.route("/api", messages);

export default app;
