# ACCESSIA Pro — Security Operations Guide

Scope: production site `access-ia.pro` hosted on YunoHost (`srv.access-ia.pro`),
served by Nginx with PHP-FPM behind the YunoHost reverse proxy. Static assets
plus `contact.php` for the contact form.

This document is the day-to-day playbook for verifying, hardening, and
operating the site. It complements:

- `.htaccess` (Apache fallback hardening)
- `nginx-yunohost-headers.conf` (Nginx reference, copy on server when needed)
- `.well-known/security.txt` (disclosure contact)
- `.github/workflows/security.yml` (CI security scanning)

---

## 1. YunoHost server checklist (manual)

Run through this list at every release and at least once per quarter.

### 1.1 System hygiene

- [ ] OS up to date: `sudo apt update && sudo apt -y upgrade`
- [ ] YunoHost up to date: `sudo yunohost tools update && sudo yunohost tools upgrade`
- [ ] Unattended-upgrades enabled: `systemctl status unattended-upgrades`
- [ ] Reboot if kernel was upgraded: `needs-restarting -r || cat /var/run/reboot-required`
- [ ] Disk health: `df -h && sudo journalctl --disk-usage`

### 1.2 Network and firewall

- [ ] Only required ports open: `sudo yunohost firewall list`
- [ ] SSH on non-default port (or behind VPN) and key-based auth only
- [ ] fail2ban active on SSH + nginx: `sudo fail2ban-client status`
- [ ] Per-app fail2ban jail for `nginx-http-auth` and `nginx-botsearch`

### 1.3 TLS / HTTPS

- [ ] Cert valid > 30 days: `sudo yunohost domain cert-status access-ia.pro`
- [ ] HTTP -> HTTPS redirect in place
- [ ] HSTS header served with `max-age=63072000; includeSubDomains; preload`
- [ ] Run an SSL Labs scan: https://www.ssllabs.com/ssltest/analyze.html?d=access-ia.pro
      (target A or A+)

### 1.4 Application layer

- [ ] Nginx server tokens off (`server_tokens off;` in `/etc/nginx/nginx.conf`)
- [ ] PHP `expose_php = Off` and `display_errors = Off` in production
- [ ] `error_log` enabled and not world-readable
- [ ] `/var/www/my_webapp/www/` owned by the app user, not root
- [ ] No `.git`, `.env`, `.DS_Store`, backup files reachable from the web
- [ ] `contact.php` writable only by deploy user (not the webserver)

### 1.5 Backups and recovery

- [ ] YunoHost backup of the app created weekly: `sudo yunohost backup create -n my_webapp_$(date +%F) --apps my_webapp`
- [ ] Backups copied off-host (S3, OVH PCC, B2, etc.)
- [ ] Last restore test documented in this folder (date + outcome)

### 1.6 Monitoring

- [ ] Log shipping or weekly review of `/var/log/nginx/access-ia.pro-access.log`
- [ ] Rate-limit hits visible in `/tmp/accessia_rl/`
- [ ] Email deliverability test: send a contact form submission and confirm SPF/DKIM/DMARC pass

---

## 2. Header verification commands

Run these against the live site after every deploy or Nginx config change.

```bash
# Full headers
curl -sI https://access-ia.pro/ | sort

# Quick filter for security-relevant headers
curl -sI https://access-ia.pro/ | grep -iE \
  'strict-transport|content-security|x-frame|x-content-type|referrer|permissions|cross-origin'

# Confirm HTTP -> HTTPS redirect
curl -sI http://access-ia.pro/ | head -n 3

# Check contact.php only accepts POST + correct Origin
curl -sI -X GET  https://access-ia.pro/contact.php
curl -sI -X POST https://access-ia.pro/contact.php

# Verify TLS chain + protocols
echo | openssl s_client -connect access-ia.pro:443 -servername access-ia.pro 2>/dev/null \
  | openssl x509 -noout -dates -issuer -subject

# Run nikto for a quick audit (install: sudo apt install nikto)
nikto -host https://access-ia.pro

# Mozilla Observatory (CLI via npm)
npx observatory-cli access-ia.pro
```

Server-side checks (on `srv.access-ia.pro` over SSH):

```bash
# Validate nginx config
sudo nginx -t

# Inspect effective vhost
sudo nginx -T 2>/dev/null | sed -n '/server_name access-ia.pro/,/^}/p'

# Tail logs while testing
sudo tail -f /var/log/nginx/access-ia.pro-{access,error}.log

# PHP-FPM status
sudo systemctl status php*-fpm

# Check rate-limit files created by contact.php
sudo ls -la /tmp/accessia_rl/
```

Expected security headers:

| Header                       | Expected value                                                                                                  |
|------------------------------|------------------------------------------------------------------------------------------------------------------|
| `Strict-Transport-Security`  | `max-age=63072000; includeSubDomains; preload`                                                                  |
| `X-Content-Type-Options`     | `nosniff`                                                                                                       |
| `X-Frame-Options`            | `DENY`                                                                                                          |
| `Referrer-Policy`            | `strict-origin-when-cross-origin`                                                                               |
| `Permissions-Policy`         | `camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()`                                      |
| `Content-Security-Policy`    | Aligned with the `<meta>` tag in `index.html` (`default-src 'self'; ... frame-ancestors 'none'`)                |
| `Cross-Origin-Opener-Policy` | `same-origin`                                                                                                   |
| `Cross-Origin-Resource-Policy` | `same-origin`                                                                                                 |

---

## 3. GitHub Actions secrets — inventory and rotation

The deploy and security workflows under `.github/workflows/` require the
following repository secrets. Rotate any secret immediately on suspicion of
compromise.

| Secret name          | Purpose                                                                 | Rotation cadence     | How to rotate                                                                 |
|----------------------|-------------------------------------------------------------------------|----------------------|-------------------------------------------------------------------------------|
| `SSH_PRIVATE_KEY`    | Deploy key for `srv.access-ia.pro` (rsync over SSH)                     | Every 90 days        | Generate `ssh-keygen -t ed25519`, push pub key to server `~/.ssh/authorized_keys`, remove old key |
| `SSH_KNOWN_HOSTS`    | Pinned host key for `srv.access-ia.pro`                                 | On server reinstall  | `ssh-keyscan -t ed25519,rsa srv.access-ia.pro`                                |
| `SSH_HOST`           | `srv.access-ia.pro` (or IP)                                             | On infra move        | Update GitHub secret                                                          |
| `SSH_USER`           | Deploy user on YunoHost                                                 | On user change       | Update GitHub secret                                                          |
| `DEPLOY_PATH`        | `/var/www/my_webapp/www/`                                               | Rarely               | Update if path changes                                                        |
| `OVH_*` (if used)    | OVH API or webhook tokens                                               | Every 90 days        | OVH manager > API > revoke + regenerate                                       |

Rotation procedure (deploy SSH key):

```bash
# 1. On a trusted workstation
ssh-keygen -t ed25519 -C "github-actions-accessia-$(date +%F)" -f ./id_deploy_$(date +%F)

# 2. Add the new public key on the server
ssh deploy@srv.access-ia.pro "cat >> ~/.ssh/authorized_keys" < ./id_deploy_$(date +%F).pub

# 3. Update GitHub secret SSH_PRIVATE_KEY with the private key contents
gh secret set SSH_PRIVATE_KEY < ./id_deploy_$(date +%F)

# 4. Trigger a deploy and confirm success
gh workflow run deploy.yml

# 5. Remove the old public key from authorized_keys on the server, then
#    securely delete the local private key (`shred -u` on Linux)
```

Audit log:

- [ ] Last rotation date: `____-__-__`
- [ ] Last rotation by:   `_________________`

Keep a one-line entry per rotation appended below.

---

## 4. Testing `contact.php` (curl examples)

The endpoint is restricted to:

- HTTP method `POST`
- `Origin: https://access-ia.pro` (when header is present)
- Required fields `name`, `email`, `message`
- Honeypot field `website` must be empty
- Rate limit: 5 requests / 3600 s per IP

### 4.1 Happy path

```bash
curl -i https://access-ia.pro/contact.php \
  -H 'Origin: https://access-ia.pro' \
  -F 'name=Quentin Devesa' \
  -F 'email=test@example.com' \
  -F 'company=ACME' \
  -F 'need=diagnostic' \
  -F 'message=Bonjour, ceci est un test.' \
  -F 'website='
# Expected: HTTP/2 200 + {"ok":true}
```

### 4.2 Wrong method

```bash
curl -i https://access-ia.pro/contact.php
# Expected: HTTP/2 405 + {"ok":false,"error":"method_not_allowed"}
```

### 4.3 Bad Origin

```bash
curl -i -X POST https://access-ia.pro/contact.php \
  -H 'Origin: https://evil.example' \
  -F 'name=x' -F 'email=x@x.io' -F 'message=hi'
# Expected: HTTP/2 403 + {"ok":false,"error":"invalid_origin"}
```

### 4.4 Missing fields

```bash
curl -i -X POST https://access-ia.pro/contact.php \
  -H 'Origin: https://access-ia.pro' \
  -F 'name=Quentin' -F 'email=' -F 'message='
# Expected: HTTP/2 422 + {"ok":false,"error":"missing_required_fields"}
```

### 4.5 Invalid email

```bash
curl -i -X POST https://access-ia.pro/contact.php \
  -H 'Origin: https://access-ia.pro' \
  -F 'name=Quentin' -F 'email=not-an-email' -F 'message=hello'
# Expected: HTTP/2 422 + {"ok":false,"error":"invalid_email"}
```

### 4.6 Header injection attempt (Reply-To)

```bash
# Carriage returns in the name must not break out of the header.
curl -i -X POST https://access-ia.pro/contact.php \
  -H 'Origin: https://access-ia.pro' \
  --form-string $'name=Evil\r\nBcc: attacker@evil.tld' \
  -F 'email=test@example.com' \
  -F 'message=injection test'
# Expected: HTTP/2 200 (form accepts), but the sent mail must NOT contain
# the injected Bcc header. Verify by inspecting the received email source.
```

### 4.7 Honeypot triggered

```bash
curl -i -X POST https://access-ia.pro/contact.php \
  -H 'Origin: https://access-ia.pro' \
  -F 'name=Bot' -F 'email=bot@bot.io' -F 'message=spam' -F 'website=http://spam.io'
# Expected: HTTP/2 200 + {"ok":true}  (silently dropped, no mail sent)
```

### 4.8 Rate limit

```bash
for i in 1 2 3 4 5 6; do
  curl -s -o /dev/null -w "$i: %{http_code}\n" -X POST https://access-ia.pro/contact.php \
    -H 'Origin: https://access-ia.pro' \
    -F 'name=Quentin' -F 'email=test@example.com' -F 'message=rl test'
done
# Expected: 1..5 -> 200, 6 -> 429 (rate_limited)
# Reset by removing /tmp/accessia_rl/c_<sha1(ip)> on the server (testing only).
```

---

## 5. Incident response — quick playbook

1. **Detect** — anomaly in `nginx error.log`, mail volume spike, alert from
   `.github/workflows/security.yml`.
2. **Contain** — `sudo yunohost app stop my_webapp` if the app is the source.
   Block offending IPs in fail2ban or via `yunohost firewall`.
3. **Eradicate** — `git status` + diff `/var/www/my_webapp/www/` against the
   git repository to detect tampering. Redeploy from `main` if integrity is
   uncertain.
4. **Recover** — restore from latest YunoHost backup if needed, rotate
   secrets, force-rotate the SSH deploy key (section 3).
5. **Postmortem** — append a dated entry to `docs/incidents/` (create folder
   on first incident) with timeline, impact, and corrective actions.

Disclosure contact: see `.well-known/security.txt`.
