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
    └── staging -> develop
```

## One-time bootstrap

```bash
sudo install -d -m 0750 /opt/geolearn/{secrets,worktrees}
sudo git clone --bare git@github.com:XGamingTechnology/geolearn-client-prototype.git /opt/geolearn/repository.git
sudo git --git-dir=/opt/geolearn/repository.git worktree add /opt/geolearn/worktrees/production main
sudo git --git-dir=/opt/geolearn/repository.git worktree add /opt/geolearn/worktrees/staging develop
sudo cp /opt/geolearn/worktrees/production/deploy/.env.production.example /opt/geolearn/secrets/production.env
sudo cp /opt/geolearn/worktrees/staging/deploy/.env.staging.example /opt/geolearn/secrets/staging.env
sudo chmod 0600 /opt/geolearn/secrets/*.env
```

Point both DNS names at the VPS, use unique generated passwords, and allow only the deliberately selected SSH/HTTP/HTTPS ports in the firewall. The sample staging bindings are distinct from production so both stacks can coexist; before launch, route the staging hostname through the host's public edge on standard HTTPS and firewall its direct high ports.

## Deploy

Run the version of the script from a trusted checkout:

```bash
sudo ./ops/deploy-worktree.sh staging
sudo ./ops/deploy-worktree.sh production
```

The script fetches only the environment branch, hard-resets its dedicated worktree, builds the web image, and reconciles that environment's Compose project. Do not place secrets inside either worktree. PostgreSQL is not published on the host; administer it through `docker compose exec database psql` over SSH.
