export interface GuildScheduledEvent {
    entity_metadata: { location: string };
    name: string;
    privacy_level: 2; //GUILD_ONLY
    scheduled_start_time: ISO8601;
    scheduled_end_time: ISO8601;
    description?: string;
    entity_type: 3; //EXTERNAL
}

export interface GuildScheduledEventModify {
    entity_metadata?: { location: string };
    name?: string;
    scheduled_start_time?: ISO8601;
    scheduled_end_time?: ISO8601;
    description?: string;
}

type ISO8601 = string;
