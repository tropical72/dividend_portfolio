import subprocess
import time
import webbrowser
import os
import re
import sys

# 윈도우 인코딩(CP949) 문제 해결을 위해 표준 출력을 UTF-8로 강제하거나 이모지를 제거
def kill_process_by_port(port):
    """특정 포트를 점유 중인 프로세스를 안전하게 종료"""
    try:
        # netstat을 통해 해당 포트를 사용하는 PID 찾기
        result = subprocess.check_output(f"netstat -ano | findstr :{port}", shell=True).decode()
        pids = set(re.findall(r"LISTENING\s+(\d+)", result))
        for pid in pids:
            if pid != "0":
                print(f"[Cleanup] Port {port} cleanup (PID: {pid})...")
                subprocess.run(f"taskkill /F /T /PID {pid}", shell=True, capture_output=True)
    except Exception:
        pass

def run_dev():
    """백엔드와 프론트엔드를 실행하고 브라우저를 여는 메인 함수"""
    print("[System] Preparing development environment...")
    kill_process_by_port(8000)
    kill_process_by_port(5173)

    root_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. 백엔드 실행 (FastAPI)
    print("[Backend] Starting FastAPI server...")
    backend_cmd = [os.path.join(root_dir, "venv", "Scripts", "python"), "-m", "uvicorn", "src.backend.main:app", "--port", "8000"]
    backend_proc = subprocess.Popen(backend_cmd, cwd=root_dir)

    # 2. 프론트엔드 실행 (Vite)
    print("[Frontend] Starting Vite server...")
    frontend_dir = os.path.join(root_dir, "src", "frontend")
    frontend_cmd = ["npm.cmd", "run", "dev"]
    frontend_proc = subprocess.Popen(frontend_cmd, cwd=frontend_dir)

    # 3. 브라우저 실행
    url = "http://localhost:5173"
    print(f"[Browser] Waiting for connection... ({url})")
    time.sleep(5)
    webbrowser.open(url)

    print("\n[Success] All servers are running. (Exit: Ctrl+C)")
    
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
