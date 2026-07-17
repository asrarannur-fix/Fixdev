#!/usr/bin/env python3
import re, subprocess
from pathlib import Path

base = Path('/home/ubuntu/barufix')
src = base / 'src/components/WhatsAppConnector.tsx'
s = src.read_text()
lines = s.splitlines(True)

# Find tab boundaries
tab_info = []
for i, line in enumerate(lines):
    m = re.search(r'RENDER TAB \d+: (\w+)', line)
    if m:
        tab_info.append((i, m.group(1)))

# Find conditionals for each tab
tabs = []
for name, start_comment in [('dashboard', tab_info[0][1]), ('templates', tab_info[1][1]), ('queue', tab_info[2][1]), ('contactHistory', tab_info[3][1]), ('settings', tab_info[4][1])]:
    jx = next((i for i, l in enumerate(lines) if f'activeTab === "{name}" && (' in l), -1)
    if jx < 0: continue
    # Find end: next tab comment line - 2 (before {activeTab === next && (
    next_tab = next((i for i, l in enumerate(lines) if 'RENDER TAB' in l and i > jx), len(lines))
    # Find the closing )} at depth 0 after jx
    depth = 0; end = jx
    for k in range(jx, len(lines)):
        depth += lines[k].count('{') - lines[k].count('}')
        if depth == 0 and ')}' in lines[k]:
            end = k + 1
            break
    tabs.append((name, jx, end))

# Extract in reverse order to preserve indices
for name, jx, end in reversed(tabs):
    block = ''.join(lines[jx:end])
    body = block.replace(f'{{activeTab === "{name}" && (\\n','',1).rstrip()
    if body.endswith(')}'): body = body[:-2].rstrip()
    
    # Get imports up to component export
    comp_start = next(i for i, l in enumerate(lines) if l.startswith('export const WhatsAppConnector'))
    header = ''.join(lines[:comp_start])
    
    child_file = base / f'src/components/WhatsApp{name.capitalize()}Tab.tsx'
    child_content = header + f'''
export const WhatsApp{name.capitalize()}Tab: React.FC<any> = (props) => {{
  const {{ activeTab }} = props;
  if (activeTab !== "{name}") return null;
  return (
{body}
  );
}};
'''
    child_file.write_text(child_content)
    print(f'Extracted {name}: {len(child_content.splitlines())} lines')
    
    # Replace in parent
    s = ''.join(lines)
    s = s[:jx] + f'        <WhatsApp{name.capitalize()}Tab {{...{{ activeTab }}}} />\\n\\n' + s[end:]
    lines = s.splitlines(True)

# Add imports
import_line = 'import { useDebounce } from "../hooks/useDebounce";'
insert_imports = '''import { WhatsAppDashboardTab } from "./WhatsAppDashboardTab";
import { WhatsAppTemplateTab } from "./WhatsAppTemplateTab";
import { WhatsAppQueueTab } from "./WhatsAppQueueTab";
import { WhatsAppContactHistoryTab } from "./WhatsAppContactHistoryTab";
import { WhatsAppSettingsTab } from "./WhatsAppSettingsTab";
'''
s = ''.join(lines)
s = s.replace(import_line, import_line + '\\n' + insert_imports)
src.write_text(s)
print(f'Final parent: {len(s.splitlines())} lines')