function main() {
    const syncToken = getProperty("nextSyncToken");
    const calendarId = getProperty("calendarId");

    const events = getNewEvents(calendarId, syncToken);
    events?.forEach((event) => {
        console.log(event);
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
        console.info("新しい予定がは見つかりませんでした。");
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
