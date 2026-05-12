# Takumi Guard Setup

Takumi Guard byGMO is used as the npm-compatible registry proxy for JavaScript
dependencies. It blocks known malicious packages before they reach the local
machine or CI runner.

## Local Setup

Run the project helper:

```powershell
bun run security:takumi:setup
```

The helper keeps secrets out of the repository:

- Project `.npmrc`, `.yarnrc.yml`, and `bunfig.toml` are configured with
  `https://npm.flatt.tech/`.
- The authentication token is written only to the user npm config when
  `TAKUMI_GUARD_TOKEN` is set.
- If no token is configured, installs still use anonymous blocking mode.

To configure an email-verified or organization token locally:

```powershell
$env:TAKUMI_GUARD_TOKEN = "tg_..."
bun run security:takumi:setup
```

Do not commit the token. The checked-in project config should contain the
registry URL only.

For Python dependencies, configure pip to use the PyPI proxy:

```powershell
pip config set global.index-url https://pypi.flatt.tech/simple/
```

This writes to the user pip config, such as
`%APPDATA%\pip\pip.ini` on Windows. If you use a token, keep it in the user or
deployment secret store rather than in the repository.

For Ruby dependencies, configure Bundler to mirror RubyGems:

```powershell
bundle config set --global mirror.https://rubygems.org https://rubygems.flatt.tech/
```

Bundler stores this in the user config, typically `~/.bundle/config`. Keep the
`Gemfile` source pointed at `https://rubygems.org`; the mirror setting redirects
public gem downloads through Takumi Guard without committing a Takumi URL or
token to the repository.

## Verification

Run the blocklist verification:

```powershell
bun run security:takumi:verify
```

The verification checks the permanent test package
`@panda-guard/test-malicious` and expects Takumi Guard to reject it with HTTP
403.

## GitHub Actions

The workflow in `.github/workflows/takumi-guard.yml` uses
`flatt-security/setup-takumi-guard-npm@v1` and
`flatt-security/setup-takumi-guard-pypi@v1`, and
`flatt-security/setup-takumi-guard-rubygems@v1`.

- `id-token: write` enables OIDC token exchange.
- `contents: read` allows checkout under restricted job permissions.
- The Bot ID is public routing metadata, not a secret.
- `bun install --frozen-lockfile` keeps JS dependency state stable.
- `pip install -r requirements.txt` routes Python dependencies through Takumi
  Guard PyPI.
- `python -m pytest` runs Python tests after the guarded PyPI install.
- RubyGems is configured through Bundler. `bundle install` runs only when the
  repository has a `Gemfile`, because ElysiaAI is not currently a Ruby project.
- `bundle exec rspec` runs only when both a `Gemfile` and `spec/**/*.rb` exist.

## Webhook Endpoint Registration

The local receiver is:

```text
POST /api/webhooks/takumi/workflow
```

Register the public HTTPS URL for that path in Shisho Cloud:

1. Open `Settings > Webhook Endpoints`.
2. Click `Register a new webhook endpoint`.
3. Enter the destination URL, for example:
   `https://example.com/api/webhooks/takumi/workflow`.
4. Copy the endpoint ID (`WH...`) for workflow dispatch requests.
5. Copy the signing secret immediately and store it as
   `TAKUMI_WEBHOOK_SIGNING_SECRET` on the receiving server.
6. Use `Send test message` from the endpoint row before running a workflow.

The receiver verifies Standard Webhooks headers:

- `webhook-id`
- `webhook-timestamp`
- `webhook-signature`

The same `webhook-id` may be delivered more than once, so the server treats it
as an idempotency key and acknowledges duplicates without repeating work.

## Slack Channel Setup

If Slack shows this error:

```text
To communicate with Takumi, you have to /invite Takumi to this channel.
```

Invite the Takumi app to the target channel first:

```text
/invite @Takumi
```

For private channels, a channel member with permission to add apps must run the
invite. If the slash command cannot find the app, open the channel details,
choose Integrations or Apps, and add Takumi from there. After Takumi appears as
a channel member, retry the Takumi command or mention.

When dispatching a Takumi API workflow, pass the registered endpoint ID:

```json
{
  "notification": {
    "webhook_endpoint_ids": ["WH..."]
  }
}
```
