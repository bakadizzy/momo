from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import re
import anthropic
import json

client = anthropic.Anthropic()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

class CodeInput(BaseModel):
    code: str
    language: str

def analyze_c(code: str):
    leaks = []
    lines = code.split("\n")

    for i, line in enumerate(lines):
        stripped = line.strip()
        
        if re.search(r'\bmalloc\b|\bcalloc\b|\brealloc\b', stripped):
            leaks.append({
                "line": i + 1,
                "type": "malloc without free",
                "code_snippet": stripped
            })
        if re.search(r'\bfree\b', stripped):
            leaks = [l for l in leaks if l["type"] != "malloc without free"]
        if re.search(r'\bfopen\b', stripped):
            leaks.append({
                "line": i + 1,
                "type": "fopen without fclose",
                "code_snippet": stripped
            })
        if re.search(r'\bfclose\b', stripped):
            leaks = [l for l in leaks if l["type"] != "fopen without fclose"]
        if re.search(r'\bnew\b', stripped):
            leaks.append({
                "line": i + 1,
                "type": "new without delete",
                "code_snippet": stripped
            })
        if re.search(r'\bdelete\b', stripped):
            leaks = [l for l in leaks if l["type"] != "new without delete"]

    return leaks

def analyze_python(code: str):
    leaks = []
    lines = code.split("\n")

    for i, line in enumerate(lines):
        stripped = line.strip()
        if re.search(r'\bopen\(', stripped) and "with" not in stripped:
            leaks.append({
                "line": i + 1,
                "type": "file opened without context manager",
                "code_snippet": stripped
            })

    return leaks

# --- P4: AI layer ---
def explain_leaks(leaks: list, language: str) -> dict:
    if not leaks:
        return {"results": []}

    formatted = "\n\n".join([
        f"Leak {i+1}:\n"
        f"  Line {leak['line']}: {leak['code_snippet']}\n"
        f"  Issue: {leak['type']}"
        for i, leak in enumerate(leaks)
    ])

    prompt = f"""You are a {language} memory management expert.

A static analyzer found these memory leaks in a user's code:

{formatted}

For each leak:
1. Explain in 1-2 sentences what caused it
2. Show a concrete fix as a code snippet
3. Rate severity: Low / Medium / High

Respond ONLY with valid JSON in this exact format, no extra text:
{{
  "results": [
    {{
      "leak_number": 1,
      "explanation": "...",
      "fix": "...",
      "severity": "High"
    }}
  ]
}}"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}]
    )

    try:
        return json.loads(message.content[0].text)
    except json.JSONDecodeError:
        return {"results": [], "raw": message.content[0].text}
# --- end P4 ---

@app.post("/analyze")
def analyze(data: CodeInput):
    if data.language == "c":
        leaks = analyze_c(data.code)
    elif data.language == "python":
        leaks = analyze_python(data.code)
    else:
        leaks = []

    explanation = explain_leaks(leaks, data.language)

    return {
        "leaks": leaks,
        "explanation": explanation
    }

@app.get("/")
def root():
    return {"status": "MoMo backend is running!"}