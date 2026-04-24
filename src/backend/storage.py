import json
import os
from copy import deepcopy
from typing import Any


class StorageManager:
    """JSON 파일을 사용하여 데이터를 영구 저장하고 로드하는 클래스입니다."""

    def __init__(self, data_dir: str = "data", defaults_dir: str | None = None) -> None:
        self.data_dir = data_dir
        self.defaults_dir = defaults_dir
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir)

    def _get_data_path(self, filename: str) -> str:
        return os.path.join(self.data_dir, filename)

    def _get_default_path(self, filename: str) -> str | None:
        if not self.defaults_dir:
            return None
        return os.path.join(self.defaults_dir, filename)

    def _read_json_file(self, path: str, default_value: Any = None) -> Any:
        if not os.path.exists(path):
            return default_value

        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    return default_value
                return json.loads(content)
        except Exception:
            return default_value

    def save_json(self, filename: str, data: Any) -> None:
        """데이터를 JSON 파일로 저장합니다."""
        path = self._get_data_path(filename)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)

    def load_json(self, filename: str, default_value: Any = None) -> Any:
        """JSON 파일에서 데이터를 로드합니다."""
        path = self._get_data_path(filename)
        data = self._read_json_file(path, default_value=None)
        if data is not None:
            return data

        default_path = self._get_default_path(filename)
        if default_path:
            default_data = self._read_json_file(default_path, default_value=None)
            if default_data is not None:
                return deepcopy(default_data)

        return deepcopy(default_value) if default_value is not None else {}
