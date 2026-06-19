import re

def parse_tariff(filepath: str) -> list:
    items = []
    current_chapter = None
    
    chapter_re = re.compile(r"^--- CHAPTER (\d+) ---")
    # Matches: CODE + DESCRIPTION + 5 YEARS OF RATES (with optional /alphanumeric footnotes)
    entry_re = re.compile(
        r"^(\d{4}\.\d{2}[\d.]*)\s+"
        r"(.+?)\s+"
        r"(\d+(?:\.\d+)?)\s*/?\w*\s+(\d+(?:\.\d+)?)\s*/?\w*\s+(\d+(?:\.\d+)?)\s*/?\w*\s+(\d+(?:\.\d+)?)\s*/?\w*\s+(\d+(?:\.\d+)?)\s*/?\w*(?:\s+(\d+(?:\.\d+)?)\s*/?\w*)?\s*$"
    )
    
    skip_patterns = [
        "MFN Rates", "AHTN 2022", "Hdg.", "01 Jan", "21 Jul", 
        "Starting 01", "Description", "No. Code", "31 Dec",
    ]
    
    with open(filepath, encoding="utf-8", errors="ignore") as f:
        raw_lines = f.readlines()
        
    lines = []
    i = 0
    while i < len(raw_lines):
        line = raw_lines[i].rstrip()
        
        # If this line starts with an HS Code but doesn't contain the 5 required rate blocks...
        if re.match(r"^\d{4}\.", line) and not line.rstrip().endswith(":") and not re.search(r"\d+\s+\d+\s+\d+\s+\d+\s+\d+", line):
            # Keep gobbling next lines until we hit a line containing rates, a new code, or a new chapter
            while i + 1 < len(raw_lines):
                next_line = raw_lines[i + 1].rstrip()
                if not next_line.strip():
                    i += 1
                    continue
                # Stop conditions: if next line is a new code entry or chapter title
                if re.match(r"^\d{4}\.", next_line) or re.match(r"^--- CHAPTER", next_line):
                    break
                
                # Otherwise, consume it into the current description stream
                line = line + " " + next_line.strip()
                i += 1
                
                # If we just consumed the line that contains the actual numerical data, stop gobbling
                if re.search(r"\d+\s+\d+\s+\d+\s+\d+\s+\d+", next_line):
                    break
                    
        lines.append(line)
        i += 1
        
    for line in lines:
        line = line.rstrip()
        if not line.strip():
            continue
            
        cm = chapter_re.match(line)
        if cm:
            current_chapter = int(cm.group(1))
            continue
            
        if any(s in line for s in skip_patterns):
            continue
        if re.match(r"^\s*\(\d+\)", line):
            continue
        if re.match(r"^\s*\d{1,3}\s*$", line):
            continue
        if line.rstrip().endswith(":"):
            continue
            
        m = entry_re.match(line)
        if m and current_chapter:
            code = m.group(1)
            desc = re.sub(r"^[-\s]+", "", m.group(2)).strip()
            
            # Clean up broken footnote noise strings sometimes found inside raw table dumps
            desc = re.sub(r"\s+\d\s*/[a-z]\d?.*$", "", desc)
            desc = re.sub(r"\s+[\d\s/[a-z]]+$", "", desc) 
            
            quota_type = None
            if "In-Quota" in desc:
                quota_type = "In-Quota"
                desc = desc.replace("In-Quota", "").strip("- ").strip()
            elif "Out-Quota" in desc:
                quota_type = "Out-Quota"
                desc = desc.replace("Out-Quota", "").strip("- ").strip()
                
            if not desc:
                continue
                
            items.append({
                "chapter": current_chapter,
                "code": code,
                "description": desc,
                "rate_2024": float(m.group(3)),
                "rate_2025": float(m.group(4)),
                "rate_2026": float(m.group(6)),
                "rate_2027": float(m.group(7)),
                "rate_2028": float(m.group(8)) if m.group(8) else float(m.group(7)),
                "quota_type": quota_type,
            })
            
    return items

def get_chapter_titles(filepath: str) -> dict:
    titles = {}
    current_chapter = None
    chapter_re = re.compile(r"^--- CHAPTER (\d+) ---")
    skip = {"MFN Rates", "AHTN 2022", "Hdg.", "Notes.", "Note.", "Chapter", "SECTION", "01 Jan", "21 Jul", "Starting"}
    
    with open(filepath, encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
        
    i = 0
    while i < len(lines):
        line = lines[i].rstrip()
        m = chapter_re.match(line)
        if m:
            current_chapter = int(m.group(1))
            j = i + 1
            while j < len(lines):
                candidate = lines[j].strip()
                j += 1
                if not candidate:
                    continue
                if re.match(r"^\d{1,3}$", candidate):
                    continue
                if any(candidate.startswith(s) for s in skip):
                    continue
                if re.match(r"^\d{4}\.", candidate):
                    break
                if len(candidate) > 5:
                    titles[current_chapter] = candidate
                    break
        i += 1
    return titles
