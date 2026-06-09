#!/usr/bin/env python3
"""
book2skill — конвертер PDF/EPUB в навык для OpenClaw.

Использование:
  python3 book2skill.py <path-to-pdf-or-epub> [skill-name]

На выходе:
  ~/.openclaw/skills/<slug>/SKILL.md  — основное ядро
  ~/.openclaw/skills/<slug>/references/  — главы и глоссарий

Зависимости:
  brew install poppler  # для pdftotext
  pip3 install ebooklib beautifulsoup4  # для EPUB
"""

import json, os, re, shutil, subprocess, sys, tempfile, zipfile, html
from pathlib import Path
from urllib.parse import urlparse

SKILLS_DIR = Path.home() / ".openclaw" / "skills"

# ─── Извлечение текста ───

def extract_pdf(path: str) -> str:
    """Извлечение текста из PDF через pdftotext."""
    if not shutil.which("pdftotext"):
        # fallback на PyMuPDF если есть
        try:
            import fitz
            doc = fitz.open(path)
            return "\n\n".join(page.get_text() for page in doc)
        except ImportError:
            print("⚠️  Установи pdftotext: brew install poppler")
            sys.exit(1)
    result = subprocess.run(
        ["pdftotext", "-layout", path, "-"],
        capture_output=True, text=True, timeout=120
    )
    if result.returncode != 0:
        print(f"❌ pdftotext ошибка: {result.stderr[:200]}")
        sys.exit(1)
    return result.stdout

def extract_epub(path: str) -> str:
    """Извлечение текста из EPUB."""
    try:
        from ebooklib import epub
        from bs4 import BeautifulSoup
    except ImportError:
        print("❌ Нужен ebooklib: pip3 install ebooklib beautifulsoup4")
        sys.exit(1)
    
    book = epub.read_epub(path)
    texts = []
    for item in book.get_items():
        if item.get_type() == 9:  # ITEM_DOCUMENT
            soup = BeautifulSoup(item.get_body_content(), "html.parser")
            texts.append(soup.get_text())
    return "\n\n".join(texts)

def extract_text(path: str) -> str:
    ext = Path(path).suffix.lower()
    if ext == ".pdf":
        return extract_pdf(path)
    elif ext == ".epub":
        return extract_epub(path)
    elif ext in (".txt", ".md"):
        with open(path) as f:
            return f.read()
    else:
        print(f"❌ Неподдерживаемый формат: {ext}")
        sys.exit(1)

# ─── Структурирование через DeepSeek ───

def build_prompt(text: str, slug: str) -> str:
    """Промпт для DeepSeek: структурировать документ в SKILL.md."""
    # Обрезаем до разумного размера
    max_chars = 50000
    if len(text) > max_chars:
        text = text[:max_chars] + "\n\n[...обрезано...]"
    
    return f"""Ты — анализатор книг. Преврати документ в структурированный навык для AI-агента.

Имя навыка: {slug}

Извлеки из текста:
1. **Название и автор** книги/документа
2. **Основные концепции и ментальные модели** — кратко, суть
3. **Главы/разделы** — список с кратким содержанием каждой
4. **Ключевые термины с определениями** (глоссарий)
5. **Фреймворки, принципы, паттерны** — если есть
6. **Антипаттерны** — что НЕ надо делать (если есть)

Ответ верни строго в JSON-формате:
{{
  "title": "Название",
  "author": "Автор (если не указан — null)",
  "summary": "Краткое описание (2-3 предложения)",
  "chapters": [
    {{"id": "ch01", "title": "Название главы", "summary": "1 предложение", "pages": null}}
  ],
  "glossary": [
    {{"term": "Термин", "definition": "Определение", "chapter_ref": "ch01"}}
  ],
  "frameworks": [
    {{"name": "Название", "description": "Как применять", "context": "Когда использовать"}}
  ],
  "antipatterns": [
    {{"name": "Что не делать", "why": "Почему", "fix": "Как правильно"}}
  ],
  "tags": ["финансы", "бухучёт"]
}}

Документ:
---
{text[:40000]}---
"""

def call_deepseek(prompt: str) -> dict:
    """Вызов DeepSeek для структурирования."""
    import requests
    
    # Пробуем Gemini CLI как fallback
    try:
        result = subprocess.run(
            ["openclaw", "session", "run", "--model", "deepseek/deepseek-chat"],
            input=json.dumps({"messages": [{"role": "user", "content": prompt}]}),
            capture_output=True, text=True, timeout=120
        )
        if result.returncode == 0:
            return json.loads(result.stdout)
    except:
        pass
    
    # Fallback на прямой API запрос
    print("ℹ️  Использую Gemini CLI...")
    try:
        result = subprocess.run(
            ["gemini", prompt],
            capture_output=True, text=True, timeout=120
        )
        if result.returncode == 0:
            # Пробуем извлечь JSON из ответа
            text = result.stdout
            # Ищем JSON в ответе
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
    except:
        pass
    
    # Базовая структура, если AI не ответил
    print("⚠️  AI не ответил, создаю базовую структуру")
    return {
        "title": "Документ",
        "author": None,
        "summary": "Автоматически извлечённый документ.",
        "chapters": [{"id": "ch01", "title": "Основное содержание", "summary": "Основной текст документа"}],
        "glossary": [],
        "frameworks": [],
        "antipatterns": [],
        "tags": []
    }

# ─── Генерация навыка ───

def generate_skill(slug: str, text: str, structure: dict):
    """Создает папку навыка в ~/.openclaw/skills/<slug>/."""
    skill_dir = SKILLS_DIR / slug
    refs_dir = skill_dir / "references"
    refs_dir.mkdir(parents=True, exist_ok=True)
    
    # SKILL.md
    chapters_yaml = "\n".join(
        f'  - id: {ch["id"]}\n    title: "{ch["title"]}"\n    summary: "{ch["summary"]}"'
        for ch in structure.get("chapters", [])
    )
    
    info = structure
    skill_md = f"""---
name: {slug}
description: "{info['summary']}"
tags: {json.dumps(info.get('tags', []))}
---

# {info['title']}

{info['summary']}

## Основные концепции

{info.get('summary', '')}

## Структура

| # | Глава | Суть |
|---|-------|------|
"""
    for i, ch in enumerate(info.get("chapters", []), 1):
        skill_md += f"| {i} | {ch['title']} | {ch['summary']} |\n"
    
    if info.get("glossary"):
        skill_md += "\n## Глоссарий\n\n"
        for g in info["glossary"]:
            skill_md += f"- **{g['term']}**: {g['definition']}\n"
    
    if info.get("frameworks"):
        skill_md += "\n## Фреймворки и принципы\n\n"
        for fw in info["frameworks"]:
            skill_md += f"- **{fw['name']}**: {fw['description']}\n"
    
    if info.get("antipatterns"):
        skill_md += "\n## Антипаттерны\n\n"
        for ap in info["antipatterns"]:
            skill_md += f"- **{ap['name']}**: {ap['why']} → {ap['fix']}\n"
    
    with open(skill_dir / "SKILL.md", "w") as f:
        f.write(skill_md)
    
    # Референсы (главы)
    for ch in info.get("chapters", []):
        ch_text = f"# {ch['title']}\n\n{ch['summary']}\n\nИз документа: {info['title']}"
        with open(refs_dir / f"{ch['id']}.md", "w") as f:
            f.write(ch_text)
    
    # Глоссарий как отдельный файл
    if info.get("glossary"):
        glossary = "# Глоссарий\n\n"
        for g in info["glossary"]:
            glossary += f"## {g['term']}\n{g['definition']}\n\n"
        with open(refs_dir / "glossary.md", "w") as f:
            f.write(glossary)
    
    return skill_dir

# ─── Точка входа ───

def main():
    if len(sys.argv) < 2:
        print("Использование: python3 book2skill.py <path-to-pdf-or-epub> [skill-name]")
        print("  path  — PDF, EPUB, TXT или MD файл")
        print("  name  — название навыка (латиницей, slug)")
        sys.exit(1)
    
    path = sys.argv[1]
    if not os.path.exists(path):
        print(f"❌ Файл не найден: {path}")
        sys.exit(1)
    
    # Определяем имя навыка
    base = Path(path).stem
    slug = sys.argv[2] if len(sys.argv) > 2 else re.sub(r'[^a-z0-9-]', '', base.lower().replace(' ', '-'))[:40]
    
    print(f"📖 Читаю: {path}")
    print(f"🏷️  Навык: {slug}")
    
    # Шаг 1: извлекаем текст
    print("🔄 Извлекаю текст...")
    text = extract_text(path)
    print(f"✅ {len(text)} символов ({len(text.split())} слов)")
    
    # Шаг 2: структурируем через AI
    print("🧠 Анализирую через DeepSeek...")
    prompt = build_prompt(text, slug)
    structure = call_deepseek(prompt)
    
    # Шаг 3: генерируем навык
    print("📁 Генерирую навык...")
    skill_dir = generate_skill(slug, text, structure)
    
    print(f"\n✅ Готово! Навык создан: {skill_dir}")
    print(f"   📄 SKILL.md — {os.path.getsize(skill_dir / 'SKILL.md')} байт")
    refs = skill_dir / "references"
    if refs.exists():
        files = list(refs.iterdir())
        print(f"   📁 {len(files)} файлов в references/")
    print()
    print(f"Теперь ты можешь ссылаться на навык: \"используй навык {slug}\"")

if __name__ == "__main__":
    main()
