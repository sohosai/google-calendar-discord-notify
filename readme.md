## デプロイ方法(仮)
1. クローンする
2. `npm run -w gas tsc` を実行し、gas/dist/main.jsの内容をGASにコピペする
3. GASのエディタにある、プロジェクトの設定→スクリプト プロパティで、以下のように設定する

|   プロパティ   |                            値                              |
|---------------|------------------------------------------------------------|
| WORKERS_TOKEN | トークンを自分で適当に生成し設定。5のトークンと共通のものを使う  |
|  calendarId   | Google CalendarのCalendar ID。設定みたいな項目から確認できる  |
|    guildId    | イベントを作成するDiscordサーバーのguild ID                   |

4. GASのトリガーを適宜設定(詳しくは後で追記)

5. `cf-workers`ディレクトリに移動した上で、`wrangler secret put <キー名>` を実行し以下を設定。

|       キー        |                                値                                  |
|-------------------|-------------------------------------------------------------------|
|   WORKERS_TOKEN   | トークンを自分で適当に生成し設定。3のトークンと共通のものを使う         |
| DISCORD_BOT_TOKEN | Discordのbotトークン。OAuthの設定にあるClient Secretではないので注意  |

6. `npm run deploy`でCloudFlare Wokersにデプロイ

## 開発
npmのworkspace機能を使用しています。パッケージを追加する場合などは、それを念頭にお願いします。
