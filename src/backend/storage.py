import json
import os
from typing import Any


class StorageManager:
    """JSON 파일을 사용하여 데이터를 영구 저장하고 로드하는 클래스입니다."""

    def __init__(self, data_dir: str = "data") -> None:
        self.data_dir = data_dir
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir)

    def _get_path(self, filename: str) -> str:
        return os.path.join(self.data_dir, filename)

    def save_json(self, filename: str, data: Any) -> None:
        """데이터를 JSON 파일로 저장합니다."""
        path = self._get_path(filename)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)

    def load_json(self, filename: str, default_value: Any = None) -> Any:
        """JSON 파일에서 데이터를 로드합니다."""
        path = self._get_path(filename)
        if not os.path.exists(path):
            return default_value if default_value is not None else {}
        
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    return default_value if default_value is not None else {}
                return json.loads(content)
        except Exception:
            return default_value if default_value is not None else {}
