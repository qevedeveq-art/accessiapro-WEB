# Deployment Setup Guide — GitHub Actions to YunoHost

This guide explains how to configure secure GitHub Actions deployment to your YunoHost instance at `srv.access-ia.pro`.

## Overview

The deployment workflow has two secure paths:
1. **GCS/CDN deployment** — Google Cloud Storage (primary production)
2. **YunoHost/OVHcloud deployment** — Backup static + PHP fallback

Both paths require GitHub Secrets configuration. This document covers the YunoHost setup.

## Prerequisites

- SSH access to `srv.access-ia.pro` as user `qevedeveq`
- Root/sudo access (or at least sudoers for rsync)
- Ability to add/modify SSH keys and sudoers config

## Step 1: Generate a dedicated SSH key pair

Create a new SSH key specifically for GitHub Actions deployment (do NOT reuse your personal key):

```bash
# Generate 4096-bit RSA key (or use ed25519 for better security)
ssh-keygen -t ed25519 -C "github-actions-accessiapro" -f ~/.ssh/github_deploy_key -N ""

# Or RSA if your server doesn't support ed25519:
ssh-keygen -t rsa -b 4096 -C "github-actions-accessiapro" -f ~/.ssh/github_deploy_key -N ""

# The key files will be:
# - ~/.ssh/github_deploy_key (private key — SECRET)
# - ~/.ssh/github_deploy_key.pub (public key)
```

## Step 2: Add public key to YunoHost server

Copy the public key to your YunoHost server:

```bash
# Option 1: Use ssh-copy-id (easiest)
ssh-copy-id -i ~/.ssh/github_deploy_key.pub qevedeveq@srv.access-ia.pro

# Option 2: Manual copy
cat ~/.ssh/github_deploy_key.pub | ssh qevedeveq@srv.access-ia.pro "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"

# Verify the key works
ssh -i ~/.ssh/github_deploy_key qevedeveq@srv.access-ia.pro "echo 'SSH access confirmed'"
```

## Step 3: Generate SSH fingerprint (known_hosts)

Retrieve the server's SSH host key fingerprint to prevent MITM attacks:

```bash
# Generate the known_hosts entry
ssh-keyscan -H srv.access-ia.pro >> ~/.ssh/known_hosts

# Display it (you'll need this for GitHub secrets)
cat ~/.ssh/known_hosts | grep "srv.access-ia.pro"

# Example output:
# srv.access-ia.pro ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIF...
# [srv.access-ia.pro]:22 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIF...
```

Verify the fingerprint manually if possible (contact your hosting provider or use their admin panel):

```bash
# Display the key's fingerprint in a more readable format
ssh-keyscan -H srv.access-ia.pro 2>/dev/null | ssh-keygen -l -f -
```

## Step 4: Configure sudoers on YunoHost

The GitHub Actions workflow needs passwordless `sudo` for rsync to deploy to `/var/www/my_webapp/www/`.

SSH into the server and edit sudoers:

```bash
ssh qevedeveq@srv.access-ia.pro

# On the server:
sudo visudo

# Add this line at the end:
qevedeveq ALL=(root) NOPASSWD: /usr/bin/rsync

# Save and exit (Ctrl+X in nano, :wq in vim)
```

Test passwordless sudo:

```bash
# Still on the server:
sudo -n rsync --version

# Should print rsync version without asking for password
```

If you see a password prompt, the sudoers config didn't work. Try again with `sudo visudo`.

## Step 5: Create staging directory

The workflow syncs to a staging directory first, then promotes to production:

```bash
# On the server:
mkdir -p /home/qevedeveq/accessiapro-WEB-deploy/
chmod 755 /home/qevedeveq/accessiapro-WEB-deploy/
```

Verify paths:
```bash
# Staging directory (qevedeveq can write here)
ls -ld /home/qevedeveq/accessiapro-WEB-deploy/

# Production directory (must be writable via rsync + sudo)
ls -ld /var/www/my_webapp/www/
```

## Step 6: Configure GitHub Secrets

Add these secrets to your GitHub repository (Settings > Secrets and variables > Actions):

### 6a. `OVH_SSH_KEY`

The private SSH key for authentication:

```bash
# On your LOCAL machine:
cat ~/.ssh/github_deploy_key

# Copy the entire output (including BEGIN/END lines)
```

In GitHub:
- Name: `OVH_SSH_KEY`
- Value: Paste the entire private key (-----BEGIN OPENSSH PRIVATE KEY----- ... -----END OPENSSH PRIVATE KEY-----)

### 6b. `SSH_KNOWN_HOSTS`

The server's SSH public key fingerprint (prevents MITM attacks):

```bash
# On your LOCAL machine:
cat ~/.ssh/known_hosts | grep "srv.access-ia.pro"

# You'll get output like:
# srv.access-ia.pro ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIF...
# [srv.access-ia.pro]:22 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIF...
```

In GitHub:
- Name: `SSH_KNOWN_HOSTS`
- Value: Paste BOTH lines (the ones with `srv.access-ia.pro` hostname and the one with `[srv.access-ia.pro]:22`)

Example:
```
srv.access-ia.pro ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIF...
[srv.access-ia.pro]:22 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIF...
```

### 6c. `GCP_SA_KEY` (if not already set)

Your Google Cloud Service Account key for GCS deployment. Follow Google's documentation if you haven't set this up yet.

## Step 7: Test the deployment

Trigger a deployment manually:

1. Go to GitHub Actions
2. Select "Deploy — OVHcloud + GCS"
3. Click "Run workflow"

Monitor the logs:
- **build** job — should prepare and minify assets
- **deploy-gcs** job — should sync to Google Cloud
- **deploy-yunohost** job — should sync to your server

Check for errors, especially in the "Setup SSH with hardened security" step.

## Troubleshooting

### SSH connection refused / timeout

```
ERROR: Failed to sync to staging directory
```

**Causes:**
- Firewall blocking port 22
- Wrong username (should be `qevedeveq`)
- SSH key not in `authorized_keys`

**Fix:**
```bash
# Test SSH manually
ssh -i ~/.ssh/github_deploy_key qevedeveq@srv.access-ia.pro "echo 'Test'"

# If it fails, check:
# 1. Is the public key in ~/.ssh/authorized_keys on the server?
ssh qevedeveq@srv.access-ia.pro "cat ~/.ssh/authorized_keys | grep github_deploy_key"

# 2. Are permissions correct?
ssh qevedeveq@srv.access-ia.pro "ls -la ~/.ssh/"
# Should show: -rw------- for authorized_keys
```

### Sudo permission denied

```
ERROR: OVH promotion failed
```

**Cause:** Sudoers not configured correctly

**Fix:**
```bash
# SSH to server and test:
ssh qevedeveq@srv.access-ia.pro

# Try the exact command:
sudo -n rsync --version

# If password is requested, redo Step 4
```

### StrictHostKeyChecking error

If you see:
```
Host key verification failed
```

**Cause:** `SSH_KNOWN_HOSTS` secret not set or contains wrong key

**Fix:**
1. Verify the secret is set in GitHub
2. Copy the EXACT output from:
   ```bash
   cat ~/.ssh/known_hosts | grep "srv.access-ia.pro"
   ```
3. Both lines (with and without `[...]`) should be in the secret

### Staging syncs but production doesn't promote

```
rsync: read_acls: sys_acl_get_file(...)  failed
```

**Cause:** File permissions issue or sudoers misconfigured

**Fix:**
```bash
# On the server, verify sudoers entry
sudo visudo

# Make sure this line exists EXACTLY:
qevedeveq ALL=(root) NOPASSWD: /usr/bin/rsync

# Also check rsync binary path:
which rsync
# If output is different, update sudoers
```

## Security Best Practices

### SSH Key Rotation

Regenerate the SSH key annually:
1. Generate new key (Step 1)
2. Add to server (Step 2)
3. Remove old key from `~/.ssh/authorized_keys`
4. Update GitHub secret `OVH_SSH_KEY`

### Secret Rotation

- **OVH_SSH_KEY**: Rotate annually with new SSH key
- **SSH_KNOWN_HOSTS**: Update if server's SSH host keys change
- **GCP_SA_KEY**: Follow Google Cloud best practices

### Access Control

- SSH key file should have `600` permissions (readable only by owner)
- Known_hosts should have `644` permissions
- Only the `qevedeveq` user should be able to deploy
- Consider using YunoHost's built-in backup/restore features

## Monitoring Deployments

Check deployment status:

1. **GitHub Actions tab** — Visual workflow status
2. **Production site** — Verify content was deployed
3. **Server logs** — If needed:
   ```bash
   ssh qevedeveq@srv.access-ia.pro "tail -20 /var/log/syslog"
   ```

## Related Files

- Workflow definition: `.github/workflows/deploy.yml`
- Security checks: `.github/workflows/security.yml`
- GoAccess one-shot setup: `.github/workflows/setup-goaccess.yml`
- Environment variables: Defined in `deploy.yml` `env` section

## Setup GoAccess analytics (one-shot)

Workflow: `.github/workflows/setup-goaccess.yml` — exécution manuelle uniquement.
Installe GoAccess + Nginx Basic Auth pour `https://access-ia.pro/analytics/`
(rapport HTML statique régénéré toutes les heures, IPs anonymisées, crawlers exclus).

### Secret supplémentaire requis

| Secret | Valeur |
|---|---|
| `ANALYTICS_PASSWORD` | Mot de passe Basic Auth pour `/analytics/` (au moins 16 caractères aléatoires) |

Génère un mot de passe fort :

```bash
openssl rand -base64 24
```

Ajoute-le dans Settings → Secrets and variables → Actions → New repository secret.

### Sudoers supplémentaires sur le serveur

Le script `setup-goaccess.sh` doit pouvoir installer des paquets et écrire dans `/etc/nginx`.
Sur le serveur, étends la ligne sudoers (option simple — restreinte à la commande exacte) :

```bash
ssh qevedeveq@srv.access-ia.pro
sudo visudo

# Ajoute (en plus de la ligne rsync existante) :
qevedeveq ALL=(root) NOPASSWD: /usr/bin/bash /tmp/setup-goaccess.sh
```

Le script ne s'exécute qu'une seule fois pour bootstrapper le rapport ; après cela,
le cron `/etc/cron.d/goaccess-access-ia-pro` tourne en `www-data` sans sudo.

### Déclencher le setup

1. GitHub → Actions → "Setup — GoAccess analytics (YunoHost)"
2. Run workflow → renseigne `analytics_user` (défaut `admin`)
3. Vérifie que la dernière étape "Verify /analytics/ is protected" retourne `401`

Le rapport est accessible à `https://access-ia.pro/analytics/` (login Basic Auth).

## Support

For issues, check:
1. GitHub Actions logs (full error messages)
2. Server SSH logs: `ssh qevedeveq@srv.access-ia.pro "sudo tail -50 /var/log/auth.log"`
3. YunoHost admin panel for SSH key management
