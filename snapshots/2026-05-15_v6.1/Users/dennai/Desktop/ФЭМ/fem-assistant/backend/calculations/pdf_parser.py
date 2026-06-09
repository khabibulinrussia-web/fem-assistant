#!/usr/bin/env python3
"""Парсер декларации УСН и банковских выписок из PDF/сканов"""

import pdfplumber
import re
import json
import sys

def extract_text_from_pdf(path):
    text = ""
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                text += t + "\n"
    return text

def parse_usn_declaration(text):
    result = {"type": "usn_declaration", "inn": None, "year": None,
              "income": None, "expenses": None, "tax_base": None,
              "tax_rate": None, "tax_calculated": None,
              "insurance": None, "tax_payable": None,
              "confidence": 0}

    m = re.search(r'ИНН[:\s]*(\d{10,12})', text)
    if m: result["inn"] = m.group(1)

    m = re.search(r'за\s*(\d{4})\s*год', text)
    if m: result["year"] = m.group(1)

    # Коды строк и что после них ищем
    patterns = [
        (r'(?:^|\D)010(?:\D|$)\s*[\s:]*(\d[\d\s]*\d)', "income"),
        (r'(?:^|\D)020(?:\D|$)\s*[\s:]*(\d[\d\s]*\d)', "expenses"),
        (r'(?:^|\D)030(?:\D|$)\s*[\s:]*(\d[\d\s]*\d)', "tax_base"),
        (r'(?:^|\D)040(?:\D|$)\s*[\s:]*(\d+)', "tax_rate"),
        (r'(?:^|\D)050(?:\D|$)\s*[\s:]*(\d[\d\s]*\d)', "tax_calculated"),
        (r'(?:^|\D)060(?:\D|$)\s*[\s:]*(\d[\d\s]*\d)', "insurance"),
        (r'(?:^|\D)070(?:\D|$)\s*[\s:]*(\d[\d\s]*\d)', "tax_payable"),
    ]

    for pat, field in patterns:
        m = re.search(pat, text)
        if m:
            val = int(m.group(1).replace(' ', ''))
            result[field] = val

    # Confidence
    score = 0
    if result["inn"] and len(result["inn"]) >= 10: score += 20
    if result["income"]: score += 25
    if result["tax_calculated"]: score += 20
    if result["tax_rate"]: score += 15
    if result["tax_payable"]: score += 20
    result["confidence"] = score

    return result

def detect_document_type(text):
    if re.search(r'УСН|упрощенн|строка\s*\d{3}|налогов(?:ая|ой)\s+декларац', text, re.IGNORECASE):
        return "usn_declaration"
    if re.search(r'выписк|движение\s*денежн|счет\s*\d{11}', text, re.IGNORECASE):
        return "bank_statement"
    return "unknown"

def parse_pdf(path):
    text = extract_text_from_pdf(path)
    if not text.strip():
        return {"error": "Не удалось извлечь текст. Возможно, скан."}
    
    doc_type = detect_document_type(text)
    if doc_type == "usn_declaration":
        return parse_usn_declaration(text)
    else:
        return {"type": doc_type, "preview": text[:300]}

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/usn_test.pdf"
    r = parse_pdf(path)
    print(json.dumps(r, ensure_ascii=False, indent=2))
    c = r.get("confidence", 0)
    if c >= 60:
        print(f"\n✅ Уверенность {c}%")
    elif c > 0:
        print(f"\n⚠️ Частично ({c}%)")
    else:
        print(f"\n❌ Не распознано")
