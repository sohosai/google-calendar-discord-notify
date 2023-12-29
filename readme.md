## デプロイ方法
1. クローンする

### Cloudflare Workersの設定
2. `cf-workers`ディレクトリに移動した上で、`wrangler secret put <キー名>` を実行し以下を設定。

|       キー        |                                値                                  |
|-------------------|-------------------------------------------------------------------|
|   WORKERS_TOKEN   | トークンを自分で適当に生成し設定。6のトークンと共通のものを使う         |
| DISCORD_BOT_TOKEN | Discordのbotトークン。OAuthの設定にあるClient Secretではないので注意  |

3. `npm run deploy`などでCloudFlare Wokersにデプロイ

### Google Apps Script (GAS)の設定

4. `npm run -w gas tsc` を実行し、gas/dist/main.jsの内容をGASにコピペする
5. 2行目の`Object.defineProperty(exports, "__esModule", { value: true });`を削除する
6. GASのエディタにある、「プロジェクトの設定」→「スクリプト プロパティ」で、以下のように設定する

|   プロパティ   |                                                  値                                                    |
|---------------|--------------------------------------------------------------------------------------------------------|
| WORKERS_TOKEN | トークンを自分で適当に生成し設定。2のトークンと共通のものを使う                                             |
|    apiRoot    | Cloudflare Workersのルートパス。`https://google-calendar-discord-notify.xxx.workers.dev/api`のような形式 |
|  calendarId   | Google CalendarのCalendar ID。設定みたいな項目から確認できる                                              |
|    guildId    | イベントを作成するDiscordサーバーのguild ID                                                              |
|notifyChannelId| 通知を送るDiscordチャンネルのchannel ID                                                                  |


7. GASのトリガーを設定。GASエディタの、「トリガー」→右下にある「トリガーを追加」を押して、出てきたウィンドウで以下のように設定

|                項目                |                   内容                   |
|-----------------------------------|------------------------------------------|
| 実行する関数を選択                  | `main`                                   |
| 実行するデプロイを選択              | `Head`                                   |
| イベントのソースを選択              | `カレンダーから`                          |
| カレンダーの詳細を入力              | `カレンダー更新済み`                      |
| カレンダーのオーナーのメールアドレス | Calendar ID。あなたのメールアドレスではない |

8. 一度`main`関数を実行する。権限を求めるウィンドウが表示されるので、許可する



## 開発
npmのworkspace機能を使用しています。パッケージを追加する場合などは、それを念頭にお願いします。
