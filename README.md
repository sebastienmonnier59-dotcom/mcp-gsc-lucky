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

> **Bon à savoir** : tu verras qu'on te fait "choisir un site par défaut" à l'installation. Ce n'est pas une limitation — c'est juste le site utilisé quand tu ne précises rien à Claude. Tu peux interroger **n'importe quelle propriété GSC accessible à ton compte Google** en le précisant dans ta demande (ex. *"Analyse les performances de site-b.fr sur 7 jours"*).

---

## Installation pas à pas

### Étape 1 — Prérequis

- **Node.js 18 ou plus** installé sur ta machine ([télécharger ici](https://nodejs.org/))
- **Claude Desktop** installé ([télécharger ici](https://claude.ai/download))
- Un **compte Google** avec accès à au moins une propriété Search Console

### Étape 2 — Télécharger et décompresser le projet

1. Télécharge le fichier `mcp-gsc-lucky-ready.zip` depuis la [page Releases](../../releases) du repo.
2. Décompresse-le à un endroit stable (pas dans Téléchargements ni OneDrive — la sync peut poser problème). Par exemple :
   - Windows : `C:\Users\TonNom\mcp\`
   - macOS/Linux : `~/mcp/`
3. ⚠️ **Attention — dossier imbriqué** : après dézip, tu obtiens un dossier `mcp-gsc-lucky-ready/` qui contient lui-même un sous-dossier `mcp-gsc-lucky/`. Le **vrai** dossier de travail est celui du dedans.

Ton arborescence doit ressembler à ça :

```
C:\Users\TonNom\mcp\mcp-gsc-lucky-ready\mcp-gsc-lucky\
    ├── dist\
    ├── src\
    ├── package.json
    ├── README.md
    └── ...
```

**Le chemin qui compte dans la suite est celui du dossier le plus profond** (`...\mcp-gsc-lucky-ready\mcp-gsc-lucky\`).

### Étape 3 — Installer les dépendances

Ouvre un terminal (PowerShell ou cmd sur Windows, Terminal sur macOS), va dans le dossier de travail, puis installe les dépendances :

```bash
cd C:\Users\TonNom\mcp\mcp-gsc-lucky-ready\mcp-gsc-lucky
npm install
```

Ça télécharge les librairies nécessaires (google-auth-library, MCP SDK, etc.). Ça prend 30 secondes à 1 minute.

### Étape 4 — Créer une application OAuth dans Google Cloud

C'est l'étape la plus longue, mais elle ne se fait **qu'une seule fois**. Google exige que chaque utilisateur crée sa propre "application" pour autoriser Claude à lire ses données GSC.

#### 4.1 — Créer (ou sélectionner) un projet Google Cloud

1. Va sur [console.cloud.google.com](https://console.cloud.google.com/).
2. En haut à gauche, ouvre le sélecteur de projet → **Nouveau projet**.
3. Nomme-le comme tu veux (ex. "MCP GSC") → **Créer**.
4. Une fois créé, assure-toi que ton nouveau projet est bien sélectionné en haut à gauche.

#### 4.2 — Activer l'API Search Console

1. Dans le menu hamburger (☰) en haut à gauche, va dans **APIs & Services → Library**.
2. Dans la barre de recherche, tape `Search Console API`.
3. Clique sur le résultat **Google Search Console API** → **Enable**.

#### 4.3 — Configurer l'écran de consentement OAuth

1. Toujours dans **APIs & Services**, va dans **OAuth consent screen** (ou "Écran de consentement OAuth").
2. Choisis **External** → **Create**.
3. Remplis le strict minimum :
   - **App name** : ce que tu veux (ex. "MCP GSC")
   - **User support email** : ton email
   - **Developer contact information** : ton email
4. Clique **Save and continue** sur toutes les étapes suivantes (Scopes, etc. — rien à ajouter).
5. À la fin, dans la section **Test users**, clique **Add users** et ajoute ton propre email Google (celui qui a accès à la GSC que tu veux lire). ⚠️ Cette étape est obligatoire, sinon Google refusera la connexion.

#### 4.4 — Créer l'OAuth Client ID

1. Toujours dans **APIs & Services**, va dans **Credentials**.
2. Clique **+ Create credentials** en haut → **OAuth client ID**.
3. **Application type** : choisis **Desktop app** (très important).
4. Nomme-la (ex. "MCP GSC Desktop") → **Create**.
5. Une fenêtre s'affiche avec ton **Client ID** et ton **Client Secret**. **Garde-la ouverte**, tu vas en avoir besoin à l'étape suivante.

### Étape 5 — Lancer l'assistant d'authentification

Retourne dans ton terminal (toujours dans le dossier `mcp-gsc-lucky`) et lance :

```bash
node dist/auth.js
```

L'assistant va te demander :
1. De **coller ton Client ID** (celui obtenu à l'étape 4.4) → entrée
2. De **coller ton Client Secret** → entrée
3. Un navigateur s'ouvre automatiquement → **connecte-toi avec le compte Google** qui a accès à la GSC (le même que celui ajouté en test user à l'étape 4.3) → autorise l'accès
4. L'assistant te montre la liste de tes propriétés GSC accessibles → **choisis-en une comme site par défaut**
   > Rappel : ce choix n'est pas bloquant. Tu pourras toujours interroger les autres sites en les précisant dans tes demandes à Claude.

À la fin, l'assistant affiche dans le terminal un **bloc JSON prêt à copier** qui contient déjà toutes tes credentials et le chemin absolu vers le serveur. **Copie tout ce bloc**, tu vas en avoir besoin juste après.

### Étape 6 — Configurer Claude Desktop

1. Ouvre le fichier `claude_desktop_config.json` :
   - **Windows** : `%APPDATA%\Claude\claude_desktop_config.json` (tu peux taper ce chemin dans l'Explorateur)
   - **macOS** : `~/Library/Application Support/Claude/claude_desktop_config.json`

   Si le fichier n'existe pas, crée-le. Si c'est la première fois, il doit ressembler à ça :
   ```json
   {
     "mcpServers": {}
   }
   ```

2. Colle le bloc généré par l'assistant **à l'intérieur** de `"mcpServers": { ... }`. Le résultat final ressemble à ça :

   ```json
   {
     "mcpServers": {
       "gsc-lucky": {
         "command": "node",
         "args": ["C:\\Users\\TonNom\\mcp\\mcp-gsc-lucky-ready\\mcp-gsc-lucky\\dist\\index.js"],
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

   > Si tu as déjà d'autres MCP configurés, ajoute **juste** l'entrée `"gsc-lucky": { ... }` à côté des autres, en respectant les virgules JSON.

3. Sauvegarde le fichier.

### Étape 7 — Relancer Claude Desktop

1. **Quitte complètement** Claude Desktop. Fermer la fenêtre ne suffit pas :
   - **Windows** : clic droit sur l'icône Claude dans la barre système (près de l'horloge) → **Quit**
   - **macOS** : `Cmd + Q` dans Claude
2. Relance Claude Desktop.

### Étape 8 — Tester

Dans Claude, tape :

> *Liste mes propriétés Search Console.*

Tu devrais voir apparaître la liste de tes sites. Si oui, c'est bon 🎉

### Dépannage rapide

- **Claude dit "server disconnected"** → le MCP crashe au démarrage. 90% du temps c'est un problème de credentials ou de chemin. Relance `node dist/auth.js` pour régénérer le bloc à coller.
- **Erreur JSON "invalid and ignored"** → erreur de syntaxe dans `claude_desktop_config.json`. Vérifie les virgules entre les serveurs, les accolades fermées, et que les backslashes Windows sont bien doublés (`\\`).
- **Erreur 403 dans Claude** → ton compte n'est pas utilisateur de la propriété GSC. Ajoute-le dans Search Console → Settings → Users and permissions.
- **Erreur 401** → le refresh token a expiré (ça peut arriver après plusieurs mois). Relance `node dist/auth.js` pour en obtenir un nouveau.

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

> **Good to know**: the setup asks you to pick a "default site". This is not a limitation — it's just the one used when you don't specify anything to Claude. You can query **any GSC property your Google account has access to** by naming it in your prompt (e.g. *"Analyse site-b.com over 7 days"*).

---

## Step-by-step installation

### Step 1 — Requirements

- **Node.js 18+** installed ([download here](https://nodejs.org/))
- **Claude Desktop** installed ([download here](https://claude.ai/download))
- A **Google account** with access to at least one Search Console property

### Step 2 — Download and unzip the project

1. Download `mcp-gsc-lucky-ready.zip` from the [Releases page](../../releases).
2. Unzip it somewhere stable (avoid Downloads or OneDrive — sync can cause issues). For example:
   - Windows: `C:\Users\YourName\mcp\`
   - macOS/Linux: `~/mcp/`
3. ⚠️ **Heads up — nested folder**: after unzipping, you'll get a folder `mcp-gsc-lucky-ready/` that contains another folder `mcp-gsc-lucky/` inside. The **actual working folder** is the inner one.

Your tree should look like:

```
C:\Users\YourName\mcp\mcp-gsc-lucky-ready\mcp-gsc-lucky\
    ├── dist\
    ├── src\
    ├── package.json
    ├── README.md
    └── ...
```

**The path that matters from here on is the innermost folder** (`...\mcp-gsc-lucky-ready\mcp-gsc-lucky\`).

### Step 3 — Install dependencies

Open a terminal (PowerShell/cmd on Windows, Terminal on macOS), `cd` into the working folder, then install:

```bash
cd C:\Users\YourName\mcp\mcp-gsc-lucky-ready\mcp-gsc-lucky
npm install
```

Downloads the required libraries (google-auth-library, MCP SDK, etc.). Takes 30 seconds to 1 minute.

### Step 4 — Create an OAuth app in Google Cloud

This is the longest step but it's a **one-time setup**. Google requires each user to create their own "app" to authorize Claude to read their GSC data.

#### 4.1 — Create (or select) a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com/).
2. Top-left, open the project picker → **New project**.
3. Name it whatever (e.g. "MCP GSC") → **Create**.
4. Once created, make sure your new project is selected in the top-left.

#### 4.2 — Enable the Search Console API

1. Menu (☰) top-left → **APIs & Services → Library**.
2. Search for `Search Console API`.
3. Click **Google Search Console API** → **Enable**.

#### 4.3 — Configure the OAuth consent screen

1. In **APIs & Services**, go to **OAuth consent screen**.
2. Pick **External** → **Create**.
3. Fill in the bare minimum:
   - **App name**: anything (e.g. "MCP GSC")
   - **User support email**: your email
   - **Developer contact information**: your email
4. Click **Save and continue** through the next screens (Scopes, etc. — nothing to add).
5. At the end, in **Test users**, click **Add users** and add your own Google email (the one with GSC access). ⚠️ This is mandatory, otherwise Google will refuse the sign-in.

#### 4.4 — Create the OAuth Client ID

1. In **APIs & Services**, go to **Credentials**.
2. Click **+ Create credentials** at the top → **OAuth client ID**.
3. **Application type**: pick **Desktop app** (important).
4. Name it (e.g. "MCP GSC Desktop") → **Create**.
5. A dialog shows your **Client ID** and **Client Secret**. **Keep it open** — you'll need them in the next step.

### Step 5 — Run the auth helper

Back in your terminal (still in the `mcp-gsc-lucky` folder):

```bash
node dist/auth.js
```

The helper will ask you to:
1. **Paste your Client ID** (from step 4.4) → enter
2. **Paste your Client Secret** → enter
3. A browser opens automatically → **sign in with the Google account** that has GSC access (same as the test user from step 4.3) → authorize
4. The helper shows your accessible GSC properties → **pick one as default**
   > Reminder: this pick is not a limit. You can still query other sites by naming them in your Claude prompts.

At the end, the helper prints a **ready-to-paste JSON block** in the terminal containing all your credentials and the absolute path to the server. **Copy the whole block** — you'll need it right after.

### Step 6 — Configure Claude Desktop

1. Open `claude_desktop_config.json`:
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json` (paste that path into Explorer)
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

   If the file doesn't exist, create it. First-time content should look like:
   ```json
   {
     "mcpServers": {}
   }
   ```

2. Paste the block generated by the helper **inside** `"mcpServers": { ... }`. Final result:

   ```json
   {
     "mcpServers": {
       "gsc-lucky": {
         "command": "node",
         "args": ["C:\\Users\\YourName\\mcp\\mcp-gsc-lucky-ready\\mcp-gsc-lucky\\dist\\index.js"],
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

   > If you already have other MCPs configured, add **just** the `"gsc-lucky": { ... }` entry next to them, minding the JSON commas.

3. Save the file.

### Step 7 — Restart Claude Desktop

1. **Fully quit** Claude Desktop. Closing the window is not enough:
   - **Windows**: right-click the Claude icon in the system tray → **Quit**
   - **macOS**: `Cmd + Q` while Claude is focused
2. Reopen Claude Desktop.

### Step 8 — Test it

In Claude, type:

> *List my Search Console properties.*

You should see the list of your sites appear. If yes, you're all set 🎉

### Quick troubleshooting

- **Claude says "server disconnected"** → the MCP is crashing on startup. 90% of the time it's a credentials or path issue. Re-run `node dist/auth.js` to regenerate the block to paste.
- **JSON error "invalid and ignored"** → syntax error in `claude_desktop_config.json`. Check commas between servers, closing braces, and that Windows backslashes are doubled (`\\`).
- **403 error in Claude** → your account isn't a user on the GSC property. Add it in Search Console → Settings → Users and permissions.
- **401 error** → the refresh token expired (can happen after a few months). Re-run `node dist/auth.js` to get a fresh one.

---

## Licence / License

MIT — voir / see [LICENSE](./LICENSE).
