import os

import requests


def download_font():
    # URL 수정: otf -> ttf
    url = "https://github.com/google/fonts/raw/main/ofl/notosanskr/NotoSansKR-Regular.ttf"
    save_path = os.path.join("assets", "fonts", "NotoSansKR-Regular.ttf")
    
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    
    print(f"Downloading font from {url}...")
    try:
        response = requests.get(url)
        response.raise_for_status()
        with open(save_path, "wb") as f:
            f.write(response.content)
        print(f"Font saved to {save_path}")
    except Exception as e:
        print(f"Failed to download font: {e}")

if __name__ == "__main__":
    download_font()