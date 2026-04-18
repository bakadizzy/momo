from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import re

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

@app.post("/analyze")
def analyze(data: CodeInput):
    if data.language == "c":
        leaks = analyze_c(data.code)
    elif data.language == "python":
        leaks = analyze_python(data.code)
    else:
        leaks = []
    
    return {"leaks": leaks}

@app.get("/")
def root():
    return {"status": "MoMo backend is running!"}