import sys, os, re, shutil
from bs4 import BeautifulSoup
from markdownify import markdownify as md

HTML = sys.argv[1]
SLUG = sys.argv[2]                       # e.g. the-bucket-stops-here
OUT_MD = sys.argv[3]                     # where to write the .md
AUTHOR  = sys.argv[4] if len(sys.argv) > 4 else 'Ben Johnson'
DATE    = sys.argv[5] if len(sys.argv) > 5 else ''
PROJECT = sys.argv[6] if len(sys.argv) > 6 else ''
IMG_DIR = f'assets/images/writing/{SLUG}'
IMG_WEB = f'/assets/images/writing/{SLUG}'
files_dir = HTML.rsplit('.html', 1)[0] + '_files'

soup = BeautifulSoup(open(HTML, encoding='utf-8').read(), 'html.parser')

def txt(el): return el.get_text(' ', strip=True) if el else ''
title = txt(soup.select_one('h1.post-title'))
subtitle = txt(soup.find(class_='subtitle'))

body = soup.select_one('.available-content .body.markup') or soup.select_one('.body.markup')
assert body, 'no .body.markup found'

# strip obvious substack junk inside the body
for sel in ['.subscription-widget-wrap', '.subscription-widget', '.button-wrapper',
            '.image-link-expand', '.captioned-button-wrap', '.poll-embed', '.subscribe-widget']:
    for j in body.select(sel): j.decompose()

# footnote refs -> [^N]
for a in body.select('a.footnote-anchor'):
    n = a.get_text(strip=True)
    target = a.parent if (a.parent and a.parent.name == 'sup') else a
    target.replace_with(f'[^{n}]')

# figures -> token (copy image, remember caption)
os.makedirs(IMG_DIR, exist_ok=True)
figs = {}
for i, fig in enumerate(body.select('figure'), 1):
    img = fig.find('img'); cap = fig.find('figcaption')
    src = (img.get('src') if img else '') or ''
    caption = txt(cap)
    newname = None
    if src and not src.startswith('http'):
        local = os.path.join(os.path.dirname(HTML), src)
        if os.path.exists(local):
            ext = os.path.splitext(local)[1] or '.jpg'
            newname = f'{i:02d}{ext}'
            shutil.copy(local, os.path.join(IMG_DIR, newname))
    figs[i] = (newname, caption, src)
    tok = soup.new_tag('p'); tok.string = f'@@FIG{i}@@'
    fig.replace_with(tok)

prose = md(str(body), heading_style='ATX', bullets='-', escape_asterisks=False, escape_underscores=False)

# re-insert figures as markdown images (or *Image: caption* if image missing)
for i,(newname,caption,src) in figs.items():
    if newname:
        repl = f'![{caption}]({IMG_WEB}/{newname})'
    else:
        repl = f'*Image: {caption}*  <!-- unresolved src: {src} -->'
    prose = re.sub(r'\n*@@FIG'+str(i)+r'@@\n*', '\n\n'+repl+'\n\n', prose)

# footnote definitions
defs = []
for fn in soup.select('div.footnote'):
    n = txt(fn.find(class_='footnote-number')) or fn.get('id','').replace('footnote-','')
    content = fn.find(class_='footnote-content')
    if n and content:
        defs.append(f'[^{n}]: ' + md(str(content), escape_asterisks=False).strip().replace('\n\n',' '))

prose = re.sub(r'\n{3,}', '\n\n', prose).strip()
header = (f'[TITLE: {title}]\n\n[SUBTITLE: {subtitle}]\n\n[AUTHORS: {AUTHOR}]\n\n'
          f'[DATE: {DATE}]\n\n[TYPE: Essay]\n\n[PROJECT: {PROJECT}]\n\n---\n\n')
out = header + prose + ('\n\n' + '\n\n'.join(defs) if defs else '') + '\n'
open(OUT_MD,'w',encoding='utf-8').write(out)

print('TITLE:', title)
print('SUBTITLE:', subtitle[:70])
print('figures:', {i:(n,c[:35]) for i,(n,c,s) in figs.items()})
print('footnotes:', len(defs))
print('md chars:', len(out), '-> ', OUT_MD)
