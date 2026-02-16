import subprocess
import time
import webbrowser
import sys
import os

def kill_existing_processes():
    """
    안전한 실행을 위해 기존에 실행 중일 수 있는 백엔드 및 프론트엔드 프로세스를 강제 종료합니다.
    (Windows 환경 기준)
    """
    print("🧹 이전 프로세스 정리 중...")
    # python.exe (백엔드) 및 node.exe (프론트엔드) 관련 프로세스 종료
    # /F: 강제 종료, /T: 자식 프로세스까지 종료, /IM: 이미지 이름 기준
    try:
        # uvicorn(python) 정리
        subprocess.run(["taskkill", "/F", "/T", "/IM", "python.exe"], capture_output=True)
        # vite(node) 정리
        subprocess.run(["taskkill", "/F", "/T", "/IM", "node.exe"], capture_output=True)
    except Exception as e:
        print(f"⚠️ 정리 중 알림: {e}")
    time.sleep(1)

def run_dev():
    """
    백엔드와 프론트엔드를 병렬 실행하고 브라우저를 열어주는 메인 함수
    """
    # 0. 좀비 프로세스 방지 (보수적 실행)
    kill_existing_processes()

    root_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. 백엔드 실행 (FastAPI)
    print("🚀 백엔드 서버(FastAPI) 시작...")
    backend_cmd = [
        os.path.join(root_dir, "venv", "Scripts", "python"),
        "-m", "uvicorn", "src.backend.main:app", "--reload", "--port", "8000"
    ]
    backend_proc = subprocess.Popen(backend_cmd, cwd=root_dir)

    # 2. 프론트엔드 실행 (Vite)
    print("🚀 프론트엔드 서버(Vite) 시작...")
    frontend_dir = os.path.join(root_dir, "src", "frontend")
    frontend_cmd = ["npm.cmd", "run", "dev"]
    frontend_proc = subprocess.Popen(frontend_cmd, cwd=frontend_dir)

    # 3. 브라우저 자동 실행
    print("🌐 브라우저 연결 시도 (5초 대기)...")
    time.sleep(5) # Vite 서버 준비 시간 충분히 확보
    
    url = "http://localhost:5173"
    print(f"🔗 접속 주소: {url}")
    webbrowser.open(url)

    print("\n✅ 모든 서버가 안전하게 실행되었습니다. (종료: Ctrl+C)")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 프로세스 안전 종료 중...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("👋 모든 작업이 정리되었습니다.")

if __name__ == "__main__":
    run_dev()
