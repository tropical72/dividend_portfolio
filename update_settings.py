import json
import os

settings_path = os.path.join("data", "settings.json")
if os.path.exists(settings_path):
    with open(settings_path, "r", encoding="utf-8") as f:
        data = json.load(f)
else:
    data = {}

data["column_widths"] = {
    "ticker": 25,
    "name": 110,
    "price": 30,
    "yield": 30,
    "rtn": 30,
    "date": 40
}

with open(settings_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=4)
print("Settings updated successfully.")
