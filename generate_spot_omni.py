#!/usr/bin/env python3
"""
🎬 SmartMenu Australia - Video Commercial Generator via Gemini Omni Flash
========================================================================
Genera video promozionali ad alta definizione utilizzando l'API di Gemini Omni Flash
(gemini-omni-flash-preview) tramite l'SDK ufficiale google-genai.

Requisiti:
  pip install -U google-genai

Uso:
  export GEMINI_API_KEY="la_tua_api_key"
  python3 generate_spot_omni.py --mode full
  
  oppure per generare tutte le scene separate:
  python3 generate_spot_omni.py --mode scenes
"""

import os
import sys
import time
import argparse
import urllib.request
import urllib.error

try:
    from google import genai
except ImportError:
    print("❌ Errore: la libreria 'google-genai' non è installata.")
    print("👉 Esegui nel terminale: pip install -U google-genai")
    sys.exit(1)

# Prompt Completo per Spot TV da 10 Secondi (Singolo Video con tagli a tempo e audio)
FULL_SPOT_PROMPT = (
    "A crisp, cinematic 4K commercial for SmartMenu Australia in a bright, modern Melbourne cafe. "
    "[0-3s] A happy Australian man walks into the sunny cafe, takes a seat at Table 4 with a wooden QR standee, points his smartphone camera and the digital menu opens in 1 second. Text on screen: 'Scan Any Table QR'. "
    "[3-6s] Close-up of his iPhone screen as he taps on an appetizing Aussie Wagyu Burger and selects Apple Pay with instant Face ID confirmation. Text on screen: 'Order & Pay in Seconds'. "
    "[6-8s] Cut to the kitchen counter: an 80mm thermal receipt printer automatically prints the order ticket with food notes, and the chef immediately starts cooking on the grill. Text on screen: 'Instant Kitchen Print'. "
    "[8-10s] A smiling waiter delivers the delicious gourmet burger and craft beer to Table 4. The customer takes a happy bite, gives a thumbs up. Closing logo card: 'SmartMenu Australia - Turn Tables Faster'. "
    "Audio design: Upbeat acoustic indie background groove, realistic camera scan beep, Apple Pay confirmation chime, thermal printer paper buzz, cafe ambience."
)

# 6 Scene Dettagliate Separate (Per generare 6 video clip ad altissima risoluzione)
SCENES = [
    {
        "id": 1,
        "name": "01_customer_arrival",
        "duration": "5s",
        "prompt": (
            "Cinematic 4K shot in a single continuous camera move. An Australian man in smart casual attire walks into a sunlit, bustling Melbourne cafe, smiles at the barista, and sits down at outdoor Table 4 where a rustic wooden QR standee is placed. "
            "Warm golden lighting, shallow depth of field, 35mm film aesthetic. "
            "Audio design: Lively cafe background chatter, gentle espresso machine hiss, upbeat indie acoustic guitar."
        )
    },
    {
        "id": 2,
        "name": "02_scan_table_qr",
        "duration": "5s",
        "prompt": (
            "Close-up macro shot of a person's hand holding an iPhone, pointing the camera at a modern wooden table standee with a QR code and text 'TABLE 4 - SCAN TO ORDER'. "
            "The camera instantly focuses on the QR code, a subtle glowing scan laser sweeps across it, and a Safari browser banner opens up showing the colorful SmartMenu live ordering menu. "
            "Audio design: Gentle camera shutter click and instant digital confirmation chime."
        )
    },
    {
        "id": 3,
        "name": "03_browse_and_customise",
        "duration": "6s",
        "prompt": (
            "Over-the-shoulder view of a smartphone screen showing the SmartMenu app with vibrant photos. The customer's thumb smoothly taps on 'Aussie Wagyu Burger ($26.00)', selects 'Medium Rare', adds 'Extra Garlic Aioli ($2.00)' and taps the glowing orange 'Add to Cart' button. "
            "Sleek UI animations, bright outdoor table setting. "
            "Audio design: Soft tactile screen tap sound effects, upbeat rhythmic background melody."
        )
    },
    {
        "id": 4,
        "name": "04_apple_pay_checkout",
        "duration": "5s",
        "prompt": (
            "Close-up shot of the iPhone screen showing the fast checkout modal. The user double clicks the side button to trigger Apple Pay. A sleek green Face ID checkmark animates with text 'Payment Authorized $28.00 AUD'. On the table, the wooden standee reflects the sunny cafe ambiance. "
            "Audio design: Satisfying Apple Pay double-click chime followed by a crisp payment success tone."
        )
    },
    {
        "id": 5,
        "name": "05_kitchen_thermal_print",
        "duration": "5s",
        "prompt": (
            "Fast cinematic cut to the restaurant kitchen. An 80mm stainless steel thermal receipt printer automatically prints a food docket with bold text 'TABLE #4 - 1x AUSSIE WAGYU BURGER'. A professional chef in a black apron immediately grabs the ticket and begins searing the burger patty on the sizzling flat-top grill. "
            "Audio design: Mechanical thermal printer buzz and paper tear sound, followed by the sizzle of meat on a hot grill."
        )
    },
    {
        "id": 6,
        "name": "06_served_and_happy_customer",
        "duration": "6s",
        "prompt": (
            "A friendly smiling waiter carrying a wooden serving board with a gourmet Wagyu beef burger, golden crispy chips, and a cold craft beer places it down gently in front of the customer at Table 4. The customer smiles in pure delight, takes a delicious bite, and shows a 5-star rating on their phone screen. "
            "Audio design: Warm plate clinking sound, satisfied smile, joyful uplifting musical finale."
        )
    }
]

def download_video(file_uri, output_path, api_key):
    """Scarica il file video generato da Gemini."""
    separator = "&" if "?" in file_uri else "?"
    download_url = f"{file_uri}{separator}alt=media"
    
    print(f"📥 Download video in corso su: {output_path}...")
    req = urllib.request.Request(download_url)
    req.add_header("x-goog-api-key", api_key)
    
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
            with open(output_path, "wb") as f:
                while True:
                    chunk = resp.read(8192)
                    if not chunk:
                        break
                    f.write(chunk)
        print(f"✅ Video salvato con successo: {output_path} ({os.path.getsize(output_path) // 1024} KB)")
    except urllib.error.HTTPError as e:
        print(f"❌ Errore durante il download: {e.code} - {e.read().decode()}", file=sys.stderr)
        raise

def generate_video_clip(client, api_key, prompt, output_path, duration="10s", aspect_ratio="16:9"):
    """Invia la richiesta di generazione video al modello Gemini Omni Flash."""
    print(f"\n🚀 Invio richiesta a Gemini Omni Flash ({duration}, {aspect_ratio})...")
    print(f"📝 Prompt: {prompt[:90]}...")
    
    video_config = {
        "type": "video",
        "aspect_ratio": aspect_ratio,
        "duration": duration,
        "delivery": "uri"
    }
    
    try:
        interaction = client.interactions.create(
            model="gemini-omni-flash-preview",
            input=[{"type": "text", "text": prompt}],
            response_format=video_config
        )
        
        # Estrai l'URI del video generato
        outputs = getattr(interaction, "outputs", [])
        file_uri = None
        for out in outputs:
            if hasattr(out, "video") and hasattr(out.video, "uri"):
                file_uri = out.video.uri
                break
            elif isinstance(out, dict) and out.get("type") == "video" and out.get("uri"):
                file_uri = out.get("uri")
                break
                
        if not file_uri:
            # Fallback controllo diretto attributo
            file_uri = getattr(interaction, "output_uri", None)
            
        if not file_uri:
            print(f"⚠️ Risposta del modello: {interaction}")
            raise RuntimeError("Nessun URI video restituito dal modello.")
            
        download_video(file_uri, output_path, api_key)
        return output_path
    except Exception as e:
        print(f"❌ Errore durante la generazione: {e}", file=sys.stderr)
        raise

def main():
    parser = argparse.ArgumentParser(description="Generatore Video Spot con Gemini Omni Flash")
    parser.add_argument("--api-key", help="Gemini API Key (o usa la variabile GEMINI_API_KEY)")
    parser.add_argument("--mode", choices=["full", "scenes", "both"], default="full", help="Modalità: full (spot da 10s unico) o scenes (6 clip separate)")
    parser.add_argument("--aspect-ratio", default="16:9", choices=["16:9", "9:16", "1:1"], help="Formato video (default: 16:9)")
    parser.add_argument("--outdir", default="media_generated", help="Cartella di output per i video")
    args = parser.parse_args()

    api_key = args.api_key or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("❌ Errore: GEMINI_API_KEY non trovata!")
        print("👉 Impostala con: export GEMINI_API_KEY=\"la_tua_chiave\"")
        print("👉 Oppure passala con: python3 generate_spot_omni.py --api-key \"la_tua_chiave\"")
        sys.exit(1)

    client = genai.Client(api_key=api_key)
    os.makedirs(args.outdir, exist_ok=True)

    print("=" * 70)
    print("🎬 SMARTMENU AUSTRALIA - GENERATORE SPOT GEMINI OMNI FLASH")
    print(f"📁 Output Directory: {os.path.abspath(args.outdir)}")
    print(f"📐 Formato: {args.aspect_ratio}")
    print(f"⚙️  Modalità: {args.mode.upper()}")
    print("=" * 70)

    if args.mode in ["full", "both"]:
        full_out = os.path.join(args.outdir, "smartmenu_tv_commercial_10s.mp4")
        print("\n📺 Generazione Spot Televisivo Completo (10s)...")
        generate_video_clip(client, api_key, FULL_SPOT_PROMPT, full_out, duration="10s", aspect_ratio=args.aspect_ratio)

    if args.mode in ["scenes", "both"]:
        print(f"\n🎬 Generazione di {len(SCENES)} Scene Dettagliate Separate...")
        for scene in SCENES:
            scene_out = os.path.join(args.outdir, f"scene_{scene['id']}_{scene['name']}.mp4")
            print(f"\n--- Scena {scene['id']}/6: {scene['name']} ({scene['duration']}) ---")
            generate_video_clip(client, api_key, scene['prompt'], scene_out, duration=scene['duration'], aspect_ratio=args.aspect_ratio)
            time.sleep(2) # Pausa di cortesia tra le richieste

    print("\n" + "=" * 70)
    print("🎉 GENERAZIONE COMPLETATA CON SUCCESSO!")
    print(f"📂 I video generati sono disponibili in: {os.path.abspath(args.outdir)}")
    print("=" * 70)

if __name__ == "__main__":
    main()
