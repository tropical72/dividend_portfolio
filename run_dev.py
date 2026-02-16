import os
import re
import subprocess
import time
import webbrowser


def kill_process_by_port(port):
    """특정 포트를 점유 중인 프로세스를 안전하게 종료"""
    try:
        cmd = f"netstat -ano | findstr :{port}"
        result = subprocess.check_output(cmd, shell=True).decode()
        pids = set(re.findall(r"LISTENING\s+(\d+)", result))
        for pid in pids:
            if pid != "0":
                print(f"[Cleanup] Port {port} cleanup (PID: {pid})...")
                subprocess.run(f"taskkill /F /T /PID {pid}", shell=True)
    except Exception:
        pass


def run_dev():
    """백엔드와 프론트엔드를 실행하고 브라우저를 여는 메인 함수"""
    print("[System] Preparing development environment...")
    kill_process_by_port(8000)
    kill_process_by_port(5173)

    root_dir = os.path.dirname(os.path.abspath(__file__))
    python_exe = os.path.join(root_dir, "venv", "Scripts", "python")

    # 1. 백엔드 실행 (FastAPI)
    print("[Backend] Starting FastAPI server...")
    backend_cmd = [python_exe, "-m", "uvicorn", "src.backend.main:app", "--port", "8000"]
    backend_proc = subprocess.Popen(backend_cmd, cwd=root_dir)

    # 2. 프론트엔드 실행 (Vite)
    print("[Frontend] Starting Vite server...")
    frontend_dir = os.path.join(root_dir, "src", "frontend")
    frontend_proc = subprocess.Popen(["npm.cmd", "run", "dev"], cwd=frontend_dir)

    # 3. 브라우저 실행
    url = "http://localhost:5173"
    print(f"[Browser] Waiting for connection... ({url})")
    time.sleep(5)
    webbrowser.open(url)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[Exit] Terminating servers...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("[Exit] Cleaned up successfully.")


if __name__ == "__main__":
    run_dev()
