import subprocess
import time
import webbrowser
import sys
import os

def run_dev():
    """
    백엔드(FastAPI)와 프론트엔드(Vite)를 동시에 실행하는 통합 스크립트
    """
    # 프로젝트 루트 경로 확인
    root_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. 백엔드 실행 (FastAPI)
    print("🚀 백엔드 서버(FastAPI)를 시작합니다...")
    backend_cmd = [
        os.path.join(root_dir, "venv", "Scripts", "python"),
        "-m", "uvicorn", "src.backend.main:app", 
        "--reload", "--port", "8000"
    ]
    backend_proc = subprocess.Popen(backend_cmd, cwd=root_dir)

    # 2. 프론트엔드 실행 (Vite)
    print("🚀 프론트엔드 서버(Vite)를 시작합니다...")
    frontend_dir = os.path.join(root_dir, "src", "frontend")
    frontend_cmd = ["npm.cmd", "run", "dev"] # 윈도우에서는 npm.cmd 사용
    frontend_proc = subprocess.Popen(frontend_cmd, cwd=frontend_dir)

    # 3. 브라우저 자동 실행 (잠시 대기 후)
    print("🌐 브라우저를 엽니다...")
    time.sleep(3) # 서버가 뜰 때까지 잠시 대기
    webbrowser.open("http://localhost:5173")

    print("
✅ 모든 서버가 실행 중입니다. 종료하려면 Ctrl+C를 누르세요.")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("
🛑 서버를 종료합니다...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("👋 종료 완료.")

if __name__ == "__main__":
    run_dev()
