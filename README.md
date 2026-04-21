# mcp-gsc-lucky

Serveur MCP pour Google Search Console. Expose 7 outils à Claude Desktop (ou tout autre client MCP) pour interroger tes données GSC en langage naturel.

MCP server for Google Search Console. Exposes 7 tools to Claude Desktop (or any MCP client) so you can query your GSC data in plain English.

*Auteur / Author : Sébastien Monnier — MIT License*

---

## 🇫🇷 Français

### Ce que ça fait

Une fois installé, tu peux demander à Claude des trucs comme :
- *"Liste mes propriétés Search Console"*
- *"Quelles sont les 20 pages les plus performantes de [site] sur les 28 derniers jours ?"*
- *"Compare les performances de ce mois vs le mois précédent, par mot-clé"*
- *"Trouve-moi les opportunités de mots-clés : fort volume d'impressions mais position entre 5 et 20"*
- *"Inspecte cette URL : [url]"*

### Les 7 outils

| Outil | Utilité |
|-------|---------|
| `gsc_list_sites` | Liste les propriétés accessibles |
| `gsc_list_sitemaps` | Sitemaps soumis et statut d'indexation |
| `gsc_search_analytics` | Requête libre sur clicks/impressions/CTR/position |
| `gsc_inspect_url` | Statut d'indexation d'une URL (équivalent de l'outil GSC) |
| `gsc_compare_performance` | Compare deux périodes, par query ou par page |
| `gsc_find_keyword_opportunities` | Trouve les quick wins (impressions hautes + position rattrapable) |
| `gsc_get_top_pages` | Top pages triées par clicks/impressions/CTR/position |

### Installation

**Prérequis** : Node.js 18+ installé, Claude Desktop.

#### Étape 1 — Récupérer et builder le projet

Télécharger le ZIP depuis la [page Releases](../../releases), puis :

```bash
cd mcp-gsc-lucky
npm install
npm run build
```

Ou cloner depuis GitHub :

```bash
git clone https://github.com/sebastienmonnier59-dotcom/mcp-gsc-lucky.git
cd mcp-gsc-lucky
npm install
npm run build
```

#### Étape 2 — Créer un OAuth Client dans Google Cloud Console

1. Aller sur [console.cloud.google.com](https://console.cloud.google.com/) — créer ou sélectionner un projet.
2. **APIs & Services → Library** → activer **Google Search Console API**.
3. **APIs & Services → OAuth consent screen** → External → remplir le minimum requis → ajouter ton compte Google comme **test user**.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID** → type **Desktop app**.
5. Copier le **Client ID** et le **Client Secret** affichés.

#### Étape 3 — Lancer l'assistant OAuth (une seule fois)

```bash
node dist/auth.js
```

Coller Client ID et Client Secret. Le navigateur s'ouvre, tu te connectes avec ton compte Google (celui qui a accès à la GSC), tu autorises, tu choisis la propriété par défaut.

À la fin, l'assistant affiche **deux blocs JSON** : choisis celui que tu préfères pour l'étape 4.

#### Étape 4 — Configurer Claude Desktop

Éditer `claude_desktop_config.json` :
- **Windows** : `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS** : `~/Library/Application Support/Claude/claude_desktop_config.json`

**Option A — Tout dans la config Claude (recommandé)**

Colle le bloc qu'a généré l'assistant (il contient déjà tes credentials en env vars) :

```json
{
  "mcpServers": {
    "gsc-lucky": {
      "command": "node",
      "args": ["C:\\chemin\\absolu\\vers\\mcp-gsc-lucky\\dist\\index.js"],
      "env": {
        "GSC_LUCKY_CLIENT_ID": "xxx.apps.googleusercontent.com",
        "GSC_LUCKY_CLIENT_SECRET": "GOCSPX-xxx",
        "GSC_LUCKY_REFRESH_TOKEN": "1//0xxx",
        "GSC_DEFAULT_SITE_URL": "sc-domain:example.com"
      }
    }
  }
}
```

Avantage : tout est autonome, aucun fichier externe à gérer. Pour changer de compte Google plus tard, il suffira de relancer `node dist/auth.js` et de recopier le bloc.

**Option B — Via fichier credentials**

L'assistant OAuth a déjà sauvegardé tes credentials dans `~/.config/mcp-gsc-lucky/credentials.json`. Dans ce cas, la config Claude se limite à :

```json
{
  "mcpServers": {
    "gsc-lucky": {
      "command": "node",
      "args": ["C:\\chemin\\absolu\\vers\\mcp-gsc-lucky\\dist\\index.js"]
    }
  }
}
```

> Sur Windows, les backslashes doivent être **doublés** (`\\`) dans le JSON.

#### Étape 5 — Relancer Claude Desktop

Quitter complètement (clic droit icône systray → Quit) puis rouvrir. Tester : *"Liste mes propriétés Search Console."*

### Mode multi-comptes (agence)

Pour gérer plusieurs clients sans re-consentir à chaque fois, utiliser un **service account** plutôt que l'OAuth utilisateur :

1. Créer un service account dans Google Cloud Console, télécharger sa clé JSON.
2. Dans chaque propriété GSC : Settings → Users and permissions → ajouter l'email du service account comme utilisateur.
3. Dans `claude_desktop_config.json` :

```json
{
  "mcpServers": {
    "gsc-lucky": {
      "command": "node",
      "args": ["/chemin/vers/dist/index.js"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/chemin/vers/service-account.json",
        "GSC_DEFAULT_SITE_URL": "sc-domain:example.com"
      }
    }
  }
}
```

Le service account prend priorité sur l'OAuth utilisateur s'il est configuré.

### Dépannage

- **Claude dit "server disconnected"** → le MCP a crashé au démarrage. 90% du temps : credentials non configurées. Lancer `node dist/auth.js`.
- **Erreur 403** → le compte utilisé n'est pas listé comme utilisateur sur la propriété GSC. Ajouter dans Search Console → Settings → Users and permissions.
- **Erreur 401** → refresh token révoqué ou expiré. Relancer `node dist/auth.js`.
- **`invalide et ignoré`** dans la config → erreur de syntaxe JSON. Vérifier les virgules, les accolades, et les backslashes doublés sur Windows.

---

## 🇬🇧 English

### What it does

Once installed, you can ask Claude things like:
- *"List my Search Console properties"*
- *"Show me the top 20 pages for [site] over the last 28 days"*
- *"Compare this month vs last month, by query"*
- *"Find keyword opportunities: high impressions but position between 5 and 20"*
- *"Inspect this URL: [url]"*

### The 7 tools

| Tool | Purpose |
|------|---------|
| `gsc_list_sites` | List accessible properties |
| `gsc_list_sitemaps` | Submitted sitemaps and indexing status |
| `gsc_search_analytics` | Free-form query on clicks/impressions/CTR/position |
| `gsc_inspect_url` | URL indexing status (GSC inspect tool equivalent) |
| `gsc_compare_performance` | Compare two periods, by query or page |
| `gsc_find_keyword_opportunities` | Find quick wins (high impressions + recoverable position) |
| `gsc_get_top_pages` | Top pages sorted by clicks/impressions/CTR/position |

### Install

**Requirements**: Node.js 18+, Claude Desktop.

#### Step 1 — Get and build the project

Download the ZIP from the [Releases page](../../releases), then:

```bash
cd mcp-gsc-lucky
npm install
npm run build
```

Or clone from GitHub:

```bash
git clone https://github.com/sebastienmonnier59-dotcom/mcp-gsc-lucky.git
cd mcp-gsc-lucky
npm install
npm run build
```

#### Step 2 — Create an OAuth Client in Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com/) — create or pick a project.
2. **APIs & Services → Library** → enable **Google Search Console API**.
3. **APIs & Services → OAuth consent screen** → External → fill the required minimum → add your Google account as a **test user**.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID** → type **Desktop app**.
5. Copy the **Client ID** and **Client Secret** shown.

#### Step 3 — Run the OAuth helper (once)

```bash
node dist/auth.js
```

Paste Client ID and Client Secret. A browser opens, you sign in with your Google account (the one with GSC access), authorize, and pick the default property.

At the end, the helper prints **two JSON blocks** — pick the one you prefer for step 4.

#### Step 4 — Configure Claude Desktop

Edit `claude_desktop_config.json`:
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Option A — Everything in Claude config (recommended)**

Paste the block the helper generated (it includes your credentials as env vars):

```json
{
  "mcpServers": {
    "gsc-lucky": {
      "command": "node",
      "args": ["C:\\absolute\\path\\to\\mcp-gsc-lucky\\dist\\index.js"],
      "env": {
        "GSC_LUCKY_CLIENT_ID": "xxx.apps.googleusercontent.com",
        "GSC_LUCKY_CLIENT_SECRET": "GOCSPX-xxx",
        "GSC_LUCKY_REFRESH_TOKEN": "1//0xxx",
        "GSC_DEFAULT_SITE_URL": "sc-domain:example.com"
      }
    }
  }
}
```

Advantage: self-contained, no external file to manage. To switch Google account later, just re-run `node dist/auth.js` and paste the new block.

**Option B — Use the credentials file**

The OAuth helper already saved your credentials to `~/.config/mcp-gsc-lucky/credentials.json`. If you prefer, Claude config can just be:

```json
{
  "mcpServers": {
    "gsc-lucky": {
      "command": "node",
      "args": ["C:\\absolute\\path\\to\\mcp-gsc-lucky\\dist\\index.js"]
    }
  }
}
```

> On Windows, backslashes must be **doubled** (`\\`) in JSON.

#### Step 5 — Restart Claude Desktop

Fully quit (right-click the systray icon → Quit) and reopen. Test: *"List my Search Console properties."*

### Multi-account mode (agency use)

To handle multiple clients without re-consenting, use a **service account** instead of user OAuth:

1. Create a service account in Google Cloud Console, download its JSON key.
2. In each GSC property: Settings → Users and permissions → add the service account email as a user.
3. In `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gsc-lucky": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/service-account.json",
        "GSC_DEFAULT_SITE_URL": "sc-domain:example.com"
      }
    }
  }
}
```

The service account takes priority over user OAuth when both are configured.

### Troubleshooting

- **Claude says "server disconnected"** → the MCP crashed on startup. 90% of the time: missing credentials. Run `node dist/auth.js`.
- **403 error** → the account is not listed as a user on the GSC property. Add it in Search Console → Settings → Users and permissions.
- **401 error** → refresh token revoked or expired. Re-run `node dist/auth.js`.
- **`invalid and ignored`** in config → JSON syntax error. Check commas, braces, and doubled backslashes on Windows.

---

## Licence / License

MIT — voir / see [LICENSE](./LICENSE).
