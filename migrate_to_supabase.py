# migrate_to_supabase_v3.py
import json
import os
from datetime import datetime
from supabase import create_client, Client

# CONFIG
SUPABASE_URL = "https://lecpaqvuoyaddnqiknwl.supabase.co"   # ← VÉRIFIE BIEN CETTE LIGNE
SUPABASE_KEY = "sb_publishable_SeTD4PRUzegG1a5Tr1jk0A_AiZFpl-Y"  # service_role de préférence
JSON_FILE = "vote-constitution.json"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def iso_from_timestamp(ts_ms: int) -> str:
    return datetime.fromtimestamp(ts_ms / 1000).isoformat()

def migrate():
    if not os.path.exists(JSON_FILE):
        print(f"Fichier {JSON_FILE} introuvable")
        return

    with open(JSON_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"{len(data.get('rooms', []))} rooms à migrer")

    for room in data.get("rooms", []):
        room_code = room.get("code")
        if not room_code:
            print("Room sans code → ignorée")
            continue

        print(f"\nMigration room {room_code}...")

        # 1. Créer/upsert room (idempotent)
        room_payload = {
            "code": room_code,
            "phase": room.get("phase", "voting"),
            "result_name": room.get("resultName"),
            "preamble": room.get("preamble"),
            "created_at": iso_from_timestamp(room["createdAt"]),
        }

        res = (
            supabase.table("rooms")
            .upsert(room_payload, on_conflict="code")
            .execute()
        )

        if not res.data:
            print(f"Erreur room {room_code}: {res}")
            continue

        room_id = res.data[0]["id"]
        print(f"→ Room ID : {room_id}")

        # Compteur global pour index unique
        global_index = 0

        # 2. Articles (upsert idempotent)
        articles = room.get("resultArticles", [])
        for text in articles:
            if not text or not text.strip():
                continue

            prop = {
                "room_id": room_id,
                "type": "article",
                "index": global_index,
                "text": text,
                "author_name": "Migration auto",
                "created_at": room_payload["created_at"],
            }

            supabase.table("proposals").upsert(
                prop,
                on_conflict="room_id, type, index"
            ).execute()

            global_index += 1

        # 3. Amendments (index continue après articles)
        amendments = room.get("resultAmendments", [])
        for text in amendments:
            if not text or not text.strip():
                continue

            prop = {
                "room_id": room_id,
                "type": "amendment",
                "index": global_index,
                "text": text,
                "author_name": "Migration auto",
                "created_at": room_payload["created_at"],
            }

            supabase.table("proposals").upsert(
                prop,
                on_conflict="room_id, type, index"
            ).execute()

            global_index += 1

        print(f"→ {len(articles)} articles + {len(amendments)} amendements traités (ou déjà existants)")

    print("\nMigration terminée – script idempotent, peut être relancé sans risque")
    print("Les votes ne sont pas migrés (pas de mapping dans le JSON).")

if __name__ == "__main__":
    migrate()