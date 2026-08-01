#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(process.argv[2] ?? ".");
const errors = [];
const forbiddenServerFiles = new Set([
  ".htaccess",
  ".gitlab-ci.yml",
  "contact.php",
  "nginx-yunohost-headers.conf",
  ".github/workflows/DEPLOY_SETUP.md",
  "docs/GSC_MCP_SETUP.md",
  "docs/SECURITY.md",
  "scripts/goaccess.nginx.conf",
  "scripts/setup-goaccess.sh",
  "scripts/setup-gsc-mcp.sh",
]);
const textExtensions = new Set([
  ".conf", ".css", ".html", ".js", ".json", ".md", ".mjs", ".php",
  ".py", ".sh", ".toml", ".txt", ".webmanifest", ".xml", ".yaml", ".yml",
]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (
      entry.name === ".git" ||
      entry.name === "node_modules" ||
      entry.name === ".playwright-cli"
    ) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

const files = await walk(ROOT);
for (const file of files) {
  const relative = path.relative(ROOT, file).split(path.sep).join("/");
  if (forbiddenServerFiles.has(relative)) {
    errors.push(`${relative}: fichier serveur interdit dans le dépôt public`);
  }
  if (!textExtensions.has(path.extname(file)) || relative === "tests/audit-repository.mjs") {
    continue;
  }
  const contents = await readFile(file, "utf8");
  if (/(?:https?:\/\/)?[a-z0-9-]+\.access-ia\.pro/i.test(contents)) {
    errors.push(`${relative}: sous-domaine ACCESSIA interdit`);
  }
  if (/\/(?:Users|home)\/[^/\s]+|\/var\/www|authorized_keys|known_hosts|my_webapp|BEGIN (?:OPENSSH|RSA|EC|DSA) PRIVATE KEY/i.test(contents)) {
    errors.push(`${relative}: détail d’administration ou secret interdit`);
  }
  if (/github_pat_[A-Za-z0-9_]+|ghp_[A-Za-z0-9]+|AKIA[0-9A-Z]{16}/.test(contents)) {
    errors.push(`${relative}: motif de secret détecté`);
  }
  if (file.endsWith(".js") && /\.innerHTML|\.outerHTML|insertAdjacentHTML\(|document\.write\(|\beval\(|new Function/.test(contents)) {
    errors.push(`${relative}: sink JavaScript dangereux détecté`);
  }
}

if (errors.length > 0) {
  process.stderr.write(`${errors.length} erreur(s) de sécurité dépôt:\n- ${errors.join("\n- ")}\n`);
  process.exit(1);
}

process.stdout.write("Audit dépôt OK: aucun sous-domaine, détail serveur, secret ou sink JavaScript dangereux.\n");
