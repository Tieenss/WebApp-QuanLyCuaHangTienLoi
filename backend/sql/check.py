import re
def split_comma_respecting_quotes_and_parens(s):
    parts = []
    current = ''
    in_quote = False
    paren_level = 0
    i = 0
    while i < len(s):
        c = s[i]
        if c == "'":
            in_quote = not in_quote
            current += c
        elif c == '(' and not in_quote:
            paren_level += 1
            current += c
        elif c == ')' and not in_quote:
            paren_level -= 1
            current += c
        elif c == ',' and not in_quote and paren_level == 0:
            parts.append(current.strip())
            current = ''
        else:
            current += c
        i += 1
    if current.strip():
        parts.append(current.strip())
    return parts

with open('02_data_all.sql', encoding='utf-8') as f:
    sql = f.read()

inserts = re.finditer(r'INSERT INTO (\w+)\s*\((.*?)\)\s*VALUES\s*(.*?);', sql, re.DOTALL | re.IGNORECASE)
for m in inserts:
    table = m.group(1)
    cols = [c.strip() for c in m.group(2).split(',')]
    values_str = m.group(3)
    val_tuples = []
    current = ''
    in_quote = False
    paren_level = 0
    i = 0
    while i < len(values_str):
        c = values_str[i]
        if c == "'":
            in_quote = not in_quote
        elif c == '(' and not in_quote:
            paren_level += 1
            if paren_level == 1:
                current = ''
                i += 1
                continue
        elif c == ')' and not in_quote:
            paren_level -= 1
            if paren_level == 0:
                val_tuples.append(current)
                current = ''
                i += 1
                continue
        if paren_level > 0:
            current += c
        i += 1
    
    for vt in val_tuples:
        if not vt.strip(): continue
        vals = split_comma_respecting_quotes_and_parens(vt)
        if len(vals) != len(cols):
            print(f'MISMATCH in {table}: cols={len(cols)}, vals={len(vals)} -> {vals[:3]}...')
print('Check complete')
