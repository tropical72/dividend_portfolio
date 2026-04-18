from copy import deepcopy

import pytest

from src.backend.main import backend


@pytest.fixture(autouse=True)
def restore_backend_state_after_test():
    """테스트가 실제 로컬 설정 파일을 오염시키지 않도록 상태를 매번 복구한다."""
    original_state = deepcopy(backend.export_test_state())
    try:
        yield
    finally:
        backend.restore_test_state(original_state)
