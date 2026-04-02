import os
import platform
import re
import signal
import subprocess
import time
import webbrowser


def kill_process_by_port(port):
    """특정 포트를 점유 중인 프로세스를 안전하게 종료"""
    system = platform.system()
    try:
        if system == "Windows":
            cmd = f"netstat -ano | findstr :{port}"
            result = subprocess.check_output(cmd, shell=True).decode()
            pids = set(re.findall(r"LISTENING\s+(\d+)", result))
            for pid in pids:
                if pid != "0":
                    print(f"[Cleanup] Port {port} cleanup (PID: {pid})...")
                    subprocess.run(f"taskkill /F /T /PID {pid}", shell=True)
        else:
            # Linux/macOS
            cmd = f"lsof -i :{port} -t"
            try:
                result = subprocess.check_output(cmd, shell=True).decode().strip()
                if result:
                    pids = result.split("\n")
                    for pid in pids:
                        print(f"[Cleanup] Port {port} cleanup (PID: {pid})...")
                        os.kill(int(pid), signal.SIGKILL)
            except subprocess.CalledProcessError:
                # lsof returns non-zero exit code if no process found
                pass
    except Exception as e:
        print(f"[Cleanup] Warning: Failed to cleanup port {port}: {e}")


def get_python_exe(root_dir):
    """OS에 맞는 Python 실행 파일 경로 반환"""
    system = platform.system()
    # .venv와 venv 둘 다 확인
    for venv_name in [".venv", "venv"]:
        if system == "Windows":
            path = os.path.join(root_dir, venv_name, "Scripts", "python.exe")
        else:
            path = os.path.join(root_dir, venv_name, "bin", "python")
        
        if os.path.exists(path):
            return path
            
    # venv가 없으면 시스템 python 사용 (최후의 수단)
    return "python3" if system != "Windows" else "python"


def run_dev():
    """백엔드와 프론트엔드를 실행하고 브라우저를 여는 메인 함수"""
    print("[System] Preparing development environment...")
    system = platform.system()
    kill_process_by_port(8000)
    kill_process_by_port(5173)

    root_dir = os.path.dirname(os.path.abspath(__file__))
    python_exe = get_python_exe(root_dir)
    print(f"[System] Using Python: {python_exe}")

    # 1. 백엔드 실행 (FastAPI)
    print("[Backend] Starting FastAPI server...")
    backend_cmd = [
        python_exe, "-m", "uvicorn", "src.backend.main:app",
        "--port", "8000", "--host", "0.0.0.0"
    ]
    backend_proc = subprocess.Popen(backend_cmd, cwd=root_dir)

    # 2. 프론트엔드 실행 (Vite)
    print("[Frontend] Starting Vite server...")
    frontend_dir = os.path.join(root_dir, "src", "frontend")
    npm_cmd = "npm.cmd" if system == "Windows" else "npm"
    frontend_proc = subprocess.Popen([npm_cmd, "run", "dev"], cwd=frontend_dir)

    # 3. 브라우저 실행
    url = "http://localhost:5173"
    print(f"[Browser] Waiting for connection... ({url})")
    time.sleep(5)
    
    # 서버가 정상적으로 떴는지 확인하는 로직이 있으면 좋지만 일단 sleep으로 대체
    try:
        webbrowser.open(url)
    except Exception as e:
        print(f"[Browser] Warning: Could not open browser: {e}")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[Exit] Terminating servers...")
        backend_proc.terminate()
        frontend_proc.terminate()
        
        # 확실한 종료를 위해 한 번 더 cleanup
        kill_process_by_port(8000)
        kill_process_by_port(5173)
        print("[Exit] Cleaned up successfully.")


if __name__ == "__main__":
    run_dev()
