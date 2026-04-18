import React, { useState } from "react";
import "./App.css";

const SAMPLE_CODE = {
  c: `#include <stdlib.h>
#include <string.h>

void process_data(int size) {
    int *buffer = malloc(size * sizeof(int));
    char *msg = malloc(64);
    
    strcpy(msg, "Processing...");
    
    for (int i = 0; i < size; i++) {
        buffer[i] = i * 2;
    }
    
    free(buffer);
    // msg is never freed — memory leak!
}

int main() {
    int *data = malloc(100 * sizeof(int));
    process_data(50);
    // data is never freed — memory leak!
    return 0;
}`,
  python: `def load_resources():
    resources = []
    for i in range(1000):
        # Large objects accumulated and never released
        resources.append([0] * 100000)
    return resources

def run():
    cache = {}
    while True:
        key = input("Enter key: ")
        # Cache grows unboundedly — potential memory issue
        cache[key] = load_resources()
        print(f"Loaded {key}")

run()`,
};

const LANGUAGE_LABELS = { c: "C / C++", python: "Python" };

function LeakBadge({ type }) {
  const map = {
    "malloc without free": { label: "malloc leak", color: "#ff4d4d" },
    "unbounded growth": { label: "unbounded", color: "#ff9900" },
    default: { label: type, color: "#ff4d4d" },
  };
  const style = map[type] || map.default;
  return (
    <span className="leak-badge" style={{ borderColor: style.color, color: style.color }}>
      {style.label}
    </span>
  );
}

function CodeLine({ lineNumber, content, isLeaking, leakInfo }) {
  return (
    <div className={`code-line ${isLeaking ? "code-line--leak" : ""}`}>
      <span className="line-number">{lineNumber}</span>
      <span className="line-content">{content}</span>
      {isLeaking && (
        <span className="leak-marker" title={leakInfo?.type}>
          ⚠
        </span>
      )}
    </div>
  );
}

function ResultCard({ leak, index }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="result-card" style={{ animationDelay: `${index * 80}ms` }}>
      <div className="result-card__header" onClick={() => setOpen((o) => !o)}>
        <div className="result-card__left">
          <span className="result-card__line">Line {leak.line}</span>
          <LeakBadge type={leak.type} />
        </div>
        <span className={`result-card__toggle ${open ? "open" : ""}`}>▾</span>
      </div>
      {open && (
        <div className="result-card__body">
          <div className="result-card__snippet">
            <span className="snippet-lang">{leak.language}</span>
            <code>{leak.code_snippet}</code>
          </div>
          {leak.explanation && (
            <div className="result-card__explanation">
              <span className="explanation-label">AI Analysis</span>
              <p>{leak.explanation}</p>
            </div>
          )}
          {leak.fix && (
            <div className="result-card__fix">
              <span className="fix-label">Suggested Fix</span>
              <pre><code>{leak.fix}</code></pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Mock response so P1/P2 can build UI without the backend running ──
function getMockResponse(language) {
  if (language === "python") {
    return {
      leaks: [
        {
          line: 4,
          type: "unbounded growth",
          code_snippet: "resources.append([0] * 100000)",
          language: "python",
          explanation:
            "Large list objects are repeatedly appended to `resources` inside a loop with no upper bound on memory. Each call to load_resources() creates 1000 × 100,000-element lists (~800 MB) that are retained as long as `cache` lives.",
          fix: "# Option 1: use a generator\ndef load_resources(n=1000):\n    for i in range(n):\n        yield [0] * 100000\n\n# Option 2: limit cache size with an LRU cache\nfrom functools import lru_cache",
        },
        {
          line: 10,
          type: "unbounded growth",
          code_snippet: "cache[key] = load_resources()",
          language: "python",
          explanation:
            "`cache` is a plain dict that grows forever — every unique key entered at runtime adds another massive value. In long-running processes this will exhaust system memory.",
          fix: "from collections import OrderedDict\n\nMAX_CACHE = 50\ncache = OrderedDict()\n\n# In your loop:\nif len(cache) >= MAX_CACHE:\n    cache.popitem(last=False)  # evict oldest\ncache[key] = load_resources()",
        },
      ],
      explanation:
        "Two memory issues detected: an accumulation pattern inside load_resources() and an unbounded cache dictionary. Neither has an eviction policy.",
    };
  }
  return {
    leaks: [
      {
        line: 8,
        type: "malloc without free",
        code_snippet: 'char *msg = malloc(64);',
        language: "c",
        explanation:
          "`msg` is allocated with malloc() but there is no corresponding free(msg) before the function returns. Every call to process_data() leaks 64 bytes.",
        fix: "// At the end of process_data(), before returning:\nfree(msg);\nmsg = NULL;",
      },
      {
        line: 18,
        type: "malloc without free",
        code_snippet: "int *data = malloc(100 * sizeof(int));",
        language: "c",
        explanation:
          "`data` is allocated in main() but never freed before return 0. The OS reclaims it on exit, but this is still a logical leak and can mask larger leaks in longer-lived programs.",
        fix: "// Before return 0 in main():\nfree(data);\ndata = NULL;",
      },
    ],
    explanation:
      "Two heap allocations were made with malloc() but neither has a matching free(). Always pair every malloc/calloc/realloc with a free() at an appropriate scope exit.",
  };
}

export default function App() {
  const [language, setLanguage] = useState("c");
  const [code, setCode] = useState(SAMPLE_CODE["c"]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useMock, setUseMock] = useState(true);

  const leakLines = new Set((result?.leaks || []).map((l) => l.line));
  const leakByLine = Object.fromEntries(
    (result?.leaks || []).map((l) => [l.line, l])
  );
  const codeLines = code.split("\n");

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    setCode(SAMPLE_CODE[lang]);
    setResult(null);
    setError(null);
  };

  const analyze = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      if (useMock) {
        // Simulate network delay
        await new Promise((r) => setTimeout(r, 1200));
        setResult(getMockResponse(language));
      } else {
        const res = await fetch("http://localhost:8000/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, language }),
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        setResult(await res.json());
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header__brand">
          <span className="header__logo">Mo</span>
          <span className="header__logo header__logo--accent">Mo</span>
          <span className="header__tagline">// memory leak detector</span>
        </div>
        <div className="header__controls">
          <label className="mock-toggle">
            <input
              type="checkbox"
              checked={useMock}
              onChange={(e) => setUseMock(e.target.checked)}
            />
            <span>mock mode</span>
          </label>
        </div>
      </header>

      <main className="main">
        {/* ── Left: Editor Pane ── */}
        <section className="pane pane--editor">
          <div className="pane__toolbar">
            <div className="lang-selector">
              {Object.entries(LANGUAGE_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  className={`lang-btn ${language === key ? "lang-btn--active" : ""}`}
                  onClick={() => handleLanguageChange(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              className={`analyze-btn ${loading ? "analyze-btn--loading" : ""}`}
              onClick={analyze}
              disabled={loading || !code.trim()}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Scanning…
                </>
              ) : (
                <>⚡ Analyze</>
              )}
            </button>
          </div>

          <div className="editor-wrapper">
            {/* Highlighted line numbers pane */}
            <div className="code-view">
              {codeLines.map((line, i) => {
                const lineNum = i + 1;
                return (
                  <CodeLine
                    key={i}
                    lineNumber={lineNum}
                    content={line || " "}
                    isLeaking={leakLines.has(lineNum)}
                    leakInfo={leakByLine[lineNum]}
                  />
                );
              })}
            </div>
            {/* Underlying textarea for editing */}
            <textarea
              className="code-textarea"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setResult(null);
              }}
              spellCheck={false}
              placeholder="Paste your C, C++, or Python code here…"
            />
          </div>
        </section>

        {/* ── Right: Results Pane ── */}
        <section className="pane pane--results">
          <div className="pane__toolbar pane__toolbar--results">
            <span className="results-title">Results</span>
            {result && (
              <span className="leak-count">
                {result.leaks.length} leak{result.leaks.length !== 1 ? "s" : ""} found
              </span>
            )}
          </div>

          <div className="results-body">
            {!result && !error && !loading && (
              <div className="empty-state">
                <div className="empty-state__icon">🔍</div>
                <p>Paste your code and hit <strong>Analyze</strong> to detect memory leaks.</p>
                {useMock && (
                  <p className="empty-state__note">
                    Mock mode is ON — no backend needed yet.
                    <br />Toggle it off when Kiana's API is running.
                  </p>
                )}
              </div>
            )}

            {loading && (
              <div className="scanning-state">
                <div className="scan-bar" />
                <p>Scanning for leaks…</p>
              </div>
            )}

            {error && (
              <div className="error-state">
                <span className="error-icon">✖</span>
                <p>{error}</p>
                <p className="error-hint">Is the backend running on port 8000?</p>
              </div>
            )}

            {result && (
              <div className="results-list">
                {result.explanation && (
                  <div className="summary-card">
                    <span className="summary-label">Summary</span>
                    <p>{result.explanation}</p>
                  </div>
                )}
                {result.leaks.map((leak, i) => (
                  <ResultCard key={i} leak={leak} index={i} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}