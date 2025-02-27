from fastapi import FastAPI, HTTPException
from .generate_problems import ProblemGenerator
from typing import List, Optional

app = FastAPI()
generator = ProblemGenerator()

@app.get("/api/problems/{teks_standard}")
async def get_problems(
    teks_standard: str,
    count: Optional[int] = 5,
    difficulty: Optional[int] = 2
):
    try:
        problems = generator.generate_for_standard(
            teks_standard=teks_standard,
            count=count,
            difficulty=difficulty
        )
        return {"problems": problems}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
