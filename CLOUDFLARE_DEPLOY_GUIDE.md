# ☁️ Guida al Deploy su Cloudflare Pages (Risoluzione Errore & Drag & Drop)

L'errore *"This uploader does not yet support projects that require a build process"* si verifica quando l'uploader del sito Cloudflare trova file di configurazione backend (come `wrangler.toml`).

Abbiamo già risolto il problema creando all'interno di ciascun progetto una cartella pulita **`dist`** contenente esclusivamente i file web pronti per il caricamento istantaneo.

---

## 🚀 Come Caricare su Cloudflare in 30 Secondi (Senza Errori)

### 🇦🇺 Per la Versione Australia:
1. Vai su [dash.cloudflare.com](https://dash.cloudflare.com).
2. Nel menu a sinistra vai su **Workers & Pages** -> **Create application** (Crea applicazione) -> scheda **Pages**.
3. Clicca su **Upload assets** (Carica risorse).
4. Nome progetto: **`smartmenu-australia`** (o il nome che preferisci).
5. **TRASCINA LA CARTELLA `dist`** che si trova dentro:  
   `/Users/marcopanichi/Desktop/SmartMenu-Projects/smart-qr-menu-australia/dist`
6. Clicca su **Deploy site** -> **FATTO!**  
   Il tuo menu sarà online su: `https://smartmenu-australia.pages.dev`

---

### 🇮🇹 Per la Versione Italia:
1. Su [dash.cloudflare.com](https://dash.cloudflare.com) vai su **Workers & Pages** -> **Create application** -> **Pages**.
2. Clicca su **Upload assets**.
3. Nome progetto: **`smartmenu-italy`**.
4. **TRASCINA LA CARTELLA `dist`** che si trova dentro:  
   `/Users/marcopanichi/Desktop/SmartMenu-Projects/smart-qr-menu-italy/dist`
5. Clicca su **Deploy site** -> **FATTO!**  
   Il tuo menu sarà online su: `https://smartmenu-italy.pages.dev`

---

## 🌐 Collegare il tuo Dominio Personalizzato (Es. `menu.tuolocale.it`)
Dopo aver cliccato su Deploy:
1. Clicca su **Custom domains** -> **Set up a custom domain**.
2. Inserisci il tuo dominio (es. `menu.tuolocale.it` o `order.thebeaufort.com.au`).
3. Cloudflare abiliterà il certificato SSL HTTPS gratuito in automatico.
