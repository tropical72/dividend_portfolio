import { useState, useEffect } from 'react'

/**
 * 프로젝트 메인 애플리케이션 컴포넌트
 * 사이드바 내비게이션과 메인 컨텐츠 영역(탭)을 관리합니다.
 */
function App() {
  // 현재 활성화된 탭 상태 관리 (기본값: watchlist)
  const [activeTab, setActiveTab] = useState('watchlist');
  // 백엔드 연결 상태 확인
  const [health, setHealth] = useState<string>('checking...');

  useEffect(() => {
    // 백엔드 헬스체크 API 호출 (Task 1.1.1 검증용)
    fetch('http://localhost:8000/health')
      .then(res => res.json())
      .then(data => setHealth(data.status))
      .catch(() => setHealth('offline'));
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 사이드바 영역 */}
      <nav className="w-64 bg-slate-800 p-6 flex flex-col gap-4">
        <h1 className="text-xl font-bold text-orange-400 mb-4">Dividend Portfolio</h1>
        <button 
          onClick={() => setActiveTab('watchlist')}
          className={`p-3 text-left rounded ${activeTab === 'watchlist' ? 'bg-orange-500' : 'hover:bg-slate-700'}`}
        >
          Watchlist
        </button>
        <button 
          onClick={() => setActiveTab('portfolio')}
          className={`p-3 text-left rounded ${activeTab === 'portfolio' ? 'bg-orange-500' : 'hover:bg-slate-700'}`}
        >
          Portfolio
        </button>
        <div className="mt-auto pt-4 border-t border-slate-700 text-xs text-slate-400">
          Server Status: <span className={health === 'ok' ? 'text-green-400' : 'text-red-400'}>{health}</span>
        </div>
      </nav>

      {/* 메인 컨텐츠 영역 */}
      <main className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'watchlist' && (
          <section>
            <h2 className="text-2xl font-bold mb-4">Watchlist</h2>
            <p className="text-slate-400">여기에 관심 종목 목록이 표시됩니다.</p>
          </section>
        )}
        {activeTab === 'portfolio' && (
          <section>
            <h2 className="text-2xl font-bold mb-4">Portfolio</h2>
            <p className="text-slate-400">여기에 포트폴리오 분석 결과가 표시됩니다.</p>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
