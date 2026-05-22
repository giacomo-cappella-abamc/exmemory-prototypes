# Guida alle modifiche non distruttive su GitHub con Opencode

Questo documento descrive una strategia sicura e ripetibile per modificare il repository **EXmemory‑prototypes** usando Opencode, garantendo:
- **Isolamento** delle modifiche (nessun impatto diretto sul ramo stabile)
- **Possibilità di rollback** semplice (eliminare il ramo)
- **Revisione della qualità** tramite lint, skill di review e Pull Request
- **Riutilizzo** delle parti migliori dei prototype per crearne di nuovi

---

## 1. Principi di base

| Principio | Descrizione |
|-----------|-------------|
| **Lavora sempre su branch** | Mai modificare direttamente `main` o `gh-pages`. Crea una feature‑branch descrittiva. |
| **Commit atomici e descrittivi** | Ogni commit dovrebbe riguardare un singolo aspetto (es. “fix: typo in prototype‑2/index.html”). |
| **Testa localmente prima di pushare** | Apri i file HTML in un browser o avvia un server locale per verificare funzionamento e assenza di errori console. |
| **Usa le skill di Opencode** | `frontend‑philosophy`, `code‑philosophy`, `code‑review` per assicurare che le modifiche rispettino le linee guida e siano prive di “AI slop”. |
| **Pull Request come gate di qualità** | Anche se lavori da solo, apri una PR: ti obbliga a scrivere una descrizione, a vedere il diff e a far girare eventuali CI. |
| **Clean‑up** | Dopo il merge (o l’abbandono) elimina la branch sia locale che remota. |

---

## 2. Flusso di lavoro consigliato

1. **Aggiorna la base**  
   ```bash
   git fetch origin
   git checkout main
   git pull
   ```

2. **Crea una feature‑branch**  
   ```bash
   git checkout -b feature/<scopo>-<descrizione>
   ```
   Esempi: `feature/container-restyling-aprile-2026`, `feature/proto3-miglioramento-ui`, `feature/prototype-6-antigravity-text4`.

3. **Esegui le modifiche**  
   Usa `task()` o `delegate()` con le skill appropriate (vedi sezione 3).

4. **Testa localmente**  
   - Apri `index.html` oppure il file specifico del prototype in un browser.  
   - Verifica assenza di errori nella console.  
   - Controlla responsività e accessibilità.

5. **Lint / revisione qualità**  
   ```bash
   task(
     category="quick",
     load_skills=["code-review"],
     prompt="Esegui lint su tutti i file HTML/CSS/JS modificati e segnala errori o warning."
   )
   ```

6. **Commit incrementale**  
   ```bash
   git add .
   git commit -m "feat: aggiunto nuovo prototype X"
   ```

7. **Push della branch**  
   ```bash
   git push -u origin feature/<scopo>-<descrizione>
   ```

8. **Apri una Pull Request**  
   ```bash
   gh pr create \
     --title "feat: <breve descrizione>" \
     --body "Descrizione dettagliata delle modifiche, motivi e risultati dei test." \
     --base main \
     --head feature/<scopo>-<descrizione>
   ```

9. **Esito della PR**  
   - **Se approvata e i test passano**: merge (squash o rebase) → elimina la branch.  
   - **Se non approvata o decidi di non procedere**: chiudi la PR senza merge e elimina la branch.  
     ```bash
     gh pr close <numero>
     git branch -D feature/<scopo>-<descrizione>
     git push origin --delete feature/<scopo>-<descrizione>
     ```

---

## 3. Tecniche dettagliate per le varie parti del progetto

### 3.1 Modificare il **sito contenitore** (`index.html`, `css/main.css`, `js/index.js`)

- **Branch esempio**: `feature/container-restyling-aprile-2026`
- **File da toccare**:
  - `index.html`: struttura della griglia dei prototype, aggiunta di nuovi link, miglioramento ARIA.
  - `css/main.css`: variabili CSS (`:root`) per colori, spacing, dark‑mode.
  - `js/index.js`: logica di filtro/search, lazy‑loading delle anteprime.
- **Task Opencode esempio**:
  ```bash
  task(
    category="visual-engineering",
    load_skills=["frontend-philosophy", "code-review"],
    prompt="
      Aggiorna index.html per aggiungere una sezione 'Prototipi in evidenza' 
      con card che mostrano screenshot e breve descrizione.
      Usa le variabili CSS definite in :root per colori e spacing.
      Assicurati che la griglia sia responsive (flexbox o CSS Grid) 
      e che ogni card sia accessibile (role='region', aria-label).
      Dopo le modifiche, esegui lint su HTML/CSS/JS e segnala eventuali warning.
    "
  )
  ```

### 3.2 Modificare le **pagine dei singoli prototype**

Ogni prototype vive in una propria cartella sotto `prototypes/`. Per modificare uno specifico prototype (es. `prototype-3-text-to-3d-env`):

- **Branch esempio**: `feature/proto3-miglioramento-ui`
- **File tipici**:
  - `index.html` (markup principale)
  - `style.css` (stili locali)
  - `script.js` (logica, event listener, eventuali chiamate a API)
- **Task Opencode esempio**:
  ```bash
  task(
    category="visual-engineering",
    load_skills=["frontend-philosophy", "code-philosophy"],
    prompt="
      Nella cartella prototypes/prototype-3-text-to-3d-env:
      - Sostituisci l'attuale textarea con un componente più moderno 
        (label + textarea + carattere counter).
      - Aggiungi un pulsante 'Clear' che resetta il campo e la scena.
      - Migliora l'accessibilità: associa label tramite 'for', aggiungi aria-live 
        sull'output della scena.
      - In script.js, debounce la funzione di generazione (300ms) per evitare 
        chiamate eccessive.
      - Dopo le modifiche, apri il file index.html in browser e verifica 
        che la scena si generi correttamente e che non ci siano errori console.
    "
  )
  ```

### 3.3 Creare **nuovi prototype** assemblando parti migliori

Supponiamo di voler creare un **prototype‑6** che combina:
- Il motore di rendering 3D del prototype 1 (Antigravity)
- Il sistema di caricamento descrizioni testuali del prototype 3
- Lo stile di card informativo del prototype 4

**Procedura**:

1. **Branch esempio**: `feature/prototype-6-combinato-antigravity-text4`
2. **Cartella**: crea `prototypes/prototype-6-antigravity-text4/`
3. **Copia/seleziona**:
   - Da `prototype-1-antigravity/` copia `script.js` (motore 3D) e eventuali asset.
   - Da `prototype-3-text-to-3d-env/` copia l’HTML del form e la logica di parsing.
   - Da `prototype-4-exmemory4/` copia il CSS delle card/info box.
4. **Task Opencode esempio** (creazione struttura di base):
   ```bash
   task(
     category="quick",
     load_skills=["code-philosophy"],
     prompt="
       Crea la cartella prototypes/prototype-6-antigravity-text4.
       Al suo interno:
         - index.html: struttura base con header, textarea, pulsante Generate, 
           container per la scena 3D, e un aside per informazioni.
         - style.css: importa/variabili da :root, definisci layout (grid: scena 70%, info 30%),
           ripristina gli stili delle card dal prototype-4.
         - script.js: importa il motore 3D dal prototype-1 (path relativo), 
           collega l'input textarea alla funzione di generazione, 
           aggiungi debounce e gestione errori.
       Dopo la creazione, esegui un quick lint su tutti i file nuovi.
     "
   )
   ```
5. **Integrazione nel sito principale**:
   - Aggiungi un nuovo entry in `index.html` (sezione dei prototype) con link a `prototypes/prototype-6-antigravity-text4/`.
   - Aggiorna eventualmente `js/index.js` se hai bisogno di logica di filtro/search per il nuovo prototype.
6. **Test**: verifica che il nuovo prototype si avvii senza errori console, che la scena 3D risponda alle descrizioni testuali e che il layout sia coerente con gli altri.

### 3.4 Gestione di **asset condivisi** (immagini, componenti riutilizzabili)

- Metti gli asset riutilizzabili in `assets/shared-components/` o `assets/images/`.
- Quando un prototype ha bisogno di un’immagine o di un componente, **referiscilo con percorso relativo** (`../../assets/shared-components/button.html`) oppure, meglio, **copialo** nella cartella del prototype se è specifico (evita dipendenze fragili).
- Se modifichi un asset condiviso, fai il cambio su una branch dedicata (`feature/assets-update-button`) e testalo su tutti i prototype che lo usano prima di mergeare.

---

## 4. Best practice Opencode per non essere distruttivi

| Practice | Come applicarla con Opencode |
|----------|------------------------------|
| **Lavora sempre su branch** | Mai eseguire `task` direttamente su `main`/`gh-pages`. Crea prima la branch. |
| **Commit atomici e descrittivi** | Usa `bash("git commit -m \"fix: corretto typo in prototype-2/sismaroom/index.html\"")`. Evita commit grandi che toccano più ambiti indipendenti. |
| **Uso di skill di review** | Dopo ogni gruppo di modifiche, lancia `task(category="quick", load_skills=["code-review"], prompt="Esegui lint e segnala errori")` per catturare problemi prima del push. |
| **Sfrutta il delegate per task lunghi** | Se devi cercare o copiare molti file, usa `delegate(prompt="Copia tutti gli script dei prototype nella cartella backup", agent="explore")` così il lavoro va in background e tu puoi continuare a pensare. |
| **Back‑up temporaneo** | Prima di una modifica rischiosa, crea una branch di backup: `bash("git checkout -b backup/prima-di-modifica-X")`. Se qualcosa va storto, puoi tornare lì o semplicemente eliminare la branch di lavoro. |
| **Pull Request come gate di qualità** | Anche se lavori da solo, apri una PR: ti obbliga a scrivere una descrizione, a vedere il diff e a far girare eventuali CI. |
| **Clean‑up** | Dopo merge o abbandono, elimina la branch sia locale che remota: `bash("git branch -d feature/... && git push origin --delete feature/...")`. |

---

## 5. Esempio completo di flusso con Opencode (pseudo‑script)

```bash
# 1. Aggiorna base
bash("git fetch origin && git checkout main && git pull")

# 2. Crea branch per nuovo prototype combinato
bash("git checkout -b feature/prototype-6-antigravity-text4")

# 3. Crea struttura e copia parti (task con skill)
task(
  category="quick",
  load_skills=["code-philosophy"],
  prompt="
    Cartella: prototypes/prototype-6-antigravity-text4
    - index.html: struttura base con header, textarea, pulsante Generate,
      container 3D, aside info.
    - style.css: layout grid 70/30, variabili da :root, stili card da prototype-4.
    - script.js: importa motore 3D da ../prototype-1-antigravity/script.js,
      collega textarea a funzione generateScene con debounce 300ms.
  "
)

# 4. Aggiorna index.html principale per aggiungere link al nuovo prototype
task(
  category="visual-engineering",
  load_skills=["frontend-philosophy"],
  prompt="
    In index.html aggiungi una nuova card nella sezione 'Prototipi':
    <a href='prototypes/prototype-6-antigravity-text4/' class='prototype-card'>
      <h3>Prototype 6: Antigravity + Text→3D</h3>
      <p>Combina il motore 3D del prototype 1 con l'input testuale del prototype 3.</p>
    </a>
    Aggiorna eventualmente la logica di filtro in js/index.js se necessario.
  "
)

# 5. Lint e verifica
task(
  category="quick",
  load_skills=["code-review"],
  prompt="Esegui lint su tutti i file HTML/CSS/JS del nuovo prototype e sui file modificati di index.html/js/index.js."
)

# 6. Commit
bash("git add . && git commit -m \"feat: aggiunto prototype 6 (antigravity + text→3d)\"")

# 7. Push
bash("git push -u origin feature/prototype-6-antigravity-text4")

# 8. Apri PR (usa gh CLI)
bash("gh pr create --title 'feat: prototype 6 combinato' --body 'Unisce motore 3D (proto1) e input testuale (proto3).' --base main --head feature/prototype-6-antigravity-text4")

# 9. Dopo review e test:
#    - Se OK: gh pr merge <numero> --squash
#    - Se NO: gh pr close <numero> && git branch -D feature/... && git push origin --delete feature/...
```

---

## 6. Riepilogo dei punti chiave

- **Non lavorare mai direttamente su `main`/`gh-pages`**: usa sempre una **feature‑branch**.
- **Commit frequenti e descrittivi** → facilita il rollback o il cherry‑pick.
- **Testa localmente** prima di pushare; usa lint e skill di review per catturare errori precoci.
- **Usa le skill di Opencode** (`frontend‑philosophy`, `code‑philosophy`, `code‑review`) per assicurarti che le modifiche rispettino le linee guida del progetto e siano prive di “AI slop”.
- **Gestisci i prototype come cartelle indipendenti**: così è semplice copiare, modificare o eliminare senza impattare sugli altri.
- **Per nuovi prototype assemblati**: copia le parti necessarie, crea una nuova cartella, aggiungi il link nel sito principale, e testa l’integrazione.
- **Pull Request** = gate di qualità anche da solo; ti obbliga a documentare il cambiamento e a vedere il diff prima del merge.
- **Clean‑up**: elimina le branch temporanee dopo merge o abbandono per tenere il repository pulito.

Seguendo questo flusso, potrai sperimentare, migliorare e combinare i tuoi prototype EXmemory in totale sicurezza, sapendo che ogni tentativo fallimentare può essere semplicemente scartato senza lasciare tracce nello stato stabile del progetto. Buon lavoro!
