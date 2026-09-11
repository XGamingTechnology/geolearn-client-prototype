# VPS worktree operations

## Required layout

```text
/opt/geolearn/
├── repository.git
├── secrets/
│   ├── production.env
│   └── staging.env
└── worktrees/
    ├── production -> main
    └── staging -> staging
```

## One-time bootstrap

```bash
sudo install -d -m 0750 /opt/geolearn/{secrets,worktrees}
sudo git clone --bare git@github.com:XGamingTechnology/geolearn-client-prototype.git /opt/geolearn/repository.git
sudo git --git-dir=/opt/geolearn/repository.git worktree add /opt/geolearn/worktrees/production main
sudo git --git-dir=/opt/geolearn/repository.git worktree add /opt/geolearn/worktrees/staging staging
sudo cp /opt/geolearn/worktrees/production/deploy/.env.production.example /opt/geolearn/secrets/production.env
sudo cp /opt/geolearn/worktrees/staging/deploy/.env.staging.example /opt/geolearn/secrets/staging.env
sudo chmod 0600 /opt/geolearn/secrets/*.env
```

Point both DNS names at the VPS, use unique generated passwords, and allow only SSH/HTTP/HTTPS through the firewall. Import the staging site block into the shared host Caddy configuration; the staging application binding remains accessible only over host loopback.

## Deploy

Run the version of the script from a trusted checkout:

```bash
sudo ./ops/deploy-worktree.sh staging
sudo ./ops/deploy-worktree.sh production
```

The script fetches only the environment branch, hard-resets its dedicated worktree, builds the web image, and reconciles that environment's Compose project. Do not place secrets inside either worktree. PostgreSQL is not published on the host; administer it through `docker compose exec database psql` over SSH.
## Staging foundation

The staging worktree is `/opt/geolearn/worktrees/staging`. Compose exposes the Next.js container only at `127.0.0.1:3101`; PostGIS has no host port. Import the site block from `deploy/Caddyfile.staging` into the shared host Caddy configuration to serve `https://geolearn.43-156-101-13.sslip.io`, then validate and reload the host Caddy service. Do not start a second Caddy container for staging. `deploy/Caddyfile` remains the template mounted by the production Compose project and must not be replaced with staging-specific configuration.
