#!/usr/bin/env python3
"""Dependency-free local FORGE server. Apple Calendar is optional; static app works anywhere.
No credentials, progress or calendar data belong in Git. .local is private and ignored.
"""
import argparse
import ipaddress
import json
import os
import secrets
import socket
import subprocess
import sys
import threading
import webbrowser
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
PRIVATE = ROOT / '.local'
PRIVATE.mkdir(mode=0o700, exist_ok=True)
TOKEN = secrets.token_urlsafe(32)
LOCK = threading.Lock()
CALENDAR_LOCK = threading.Lock()
ASSETS = {'/': 'index.html', '/index.html': 'index.html', '/app.js': 'app.js', '/data.js': 'data.js', '/calendar.js': 'calendar.js', '/styles.css': 'styles.css', '/manifest.webmanifest':'manifest.webmanifest', '/install.js':'install.js', '/install.css':'install.css', '/icons/apple-touch-icon.png':'icons/apple-touch-icon.png', '/icons/icon-192.png':'icons/icon-192.png', '/icons/icon-512.png':'icons/icon-512.png', '/bevel.css':'bevel.css', '/bevel.js':'bevel.js', '/bevel-wander.js':'bevel-wander.js', '/assets/bevel-welcome.png':'assets/bevel-welcome.png', '/assets/bevel-focus.png':'assets/bevel-focus.png', '/assets/bevel-celebrate.png':'assets/bevel-celebrate.png'}
PROGRESS = PRIVATE / 'progress.json'

def run_bridge(payload):
    if sys.platform != 'darwin':
        raise RuntimeError('Direct Apple Calendar access needs this helper running on a Mac. Use .ics export on other systems.')
    binary = PRIVATE / 'CalendarBridge'
    source = ROOT / 'CalendarBridge.swift'
    info = ROOT / 'CalendarBridge-Info.plist'
    with CALENDAR_LOCK:
        if not binary.exists() or binary.stat().st_mtime < max(source.stat().st_mtime, info.stat().st_mtime):
            result = subprocess.run(['/usr/bin/swiftc', '-module-cache-path', str(PRIVATE / 'swiftcache'), str(source), '-o', str(binary), '-framework', 'EventKit', '-Xlinker', '-sectcreate', '-Xlinker', '__TEXT', '-Xlinker', '__info_plist', '-Xlinker', str(info)], capture_output=True, text=True, timeout=120)
            if result.returncode:
                raise RuntimeError('Could not prepare the Apple Calendar helper. Install Apple Command Line Tools, or use the .ics export. ' + result.stderr[-500:])
        result = subprocess.run([str(binary)], input=json.dumps(payload), capture_output=True, text=True, timeout=100)
        try:
            data = json.loads(result.stdout)
        except (ValueError, TypeError):
            raise RuntimeError('Calendar helper did not respond. Check macOS Calendar permissions; .ics export remains available.')
        if 'error' in data:
            raise RuntimeError(data['error'])
        return data

def validate_sessions(sessions):
    if not isinstance(sessions, list) or len(sessions) > 69:
        raise ValueError('Invalid session list.')
    ids = set()
    intervals = []
    for s in sessions:
        if not isinstance(s, dict) or not all(isinstance(s.get(k), str) for k in ['id', 'start', 'end', 'title', 'description']):
            raise ValueError('Invalid study session.')
        import re
        if not re.fullmatch(r'2026-(?:10|11)-\d\d-[012]', s['id']) or s['id'] in ids or len(s['description']) > 15000 or len(s['title']) > 200:
            raise ValueError('Invalid session identity or content.')
        start = datetime.fromisoformat(s['start'].replace('Z', '+00:00'))
        end = datetime.fromisoformat(s['end'].replace('Z', '+00:00'))
        if start.tzinfo is None or end.tzinfo is None or not (datetime(2026, 10, 28, 22, tzinfo=timezone.utc) <= start < end <= datetime(2026, 11, 19, 22, tzinfo=timezone.utc)) or not (0 < (end-start).total_seconds() <= 3*3600):
            raise ValueError('Session is outside the study period or has an invalid duration.')
        if any(start < b and end > a for a,b in intervals):
            raise ValueError('Study sessions overlap.')
        ids.add(s['id'])
        intervals.append((start,end))
    return sessions

def progress_read():
    if not PROGRESS.exists():
        return {'revision': 0, 'state': None}
    return json.loads(PROGRESS.read_text())

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        # Never log the private launch URL or bearer token.
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")
        super().end_headers()

    def respond(self, status, data):
        raw = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def host_allowed(self):
        host = self.headers.get('Host', '').split(':')[0]
        if host in ('localhost', '127.0.0.1'):
            return True
        try:
            return args.share and ipaddress.ip_address(host).is_private
        except ValueError:
            return False

    def authorized(self):
        if not self.host_allowed():
            self.respond(403, {'error':'Unrecognised host.'})
            return False
        origin = self.headers.get('Origin')
        expected = 'http://' + self.headers.get('Host', '')
        if origin and origin != expected:
            self.respond(403, {'error':'Only this app can access the local helper.'})
            return False
        if not secrets.compare_digest(self.headers.get('X-Forge-Token', ''), TOKEN):
            self.respond(401, {'error':'Open the private launch link from this server to connect.'})
            return False
        return True

    def do_HEAD(self):
        path = urlparse(self.path).path
        if path not in ASSETS or not self.host_allowed():
            self.respond(404, {'error':'Not found.'})
            return
        self.path = '/' + ASSETS[path]
        super().do_HEAD()

    def do_GET(self):
        path = urlparse(self.path).path
        if path.startswith('/api/'):
            if not self.authorized(): return
            try:
                if path == '/api/progress':
                    with LOCK: self.respond(200, progress_read())
                elif path == '/api/calendar':
                    self.respond(200, run_bridge({'action':'read'}))
                elif path == '/api/connection':
                    path = PRIVATE / 'phone-urls'
                    self.respond(200, {'shared':args.share,'phoneUrls':path.read_text().splitlines() if args.share and path.exists() else []})
                else: self.respond(404, {'error':'Unknown endpoint.'})
            except Exception as e:
                self.respond(503, {'error':str(e)})
        elif path in ASSETS and self.host_allowed():
            self.path = '/' + ASSETS[path]
            super().do_GET()
        else:
            self.respond(404, {'error':'Not found.'})

    def write_request(self):
        if not self.authorized(): return
        if self.headers.get('Content-Type','').split(';')[0] != 'application/json':
            self.respond(415, {'error':'JSON required.'}); return
        try:
            length = int(self.headers.get('Content-Length','0'))
            if length <= 0 or length > 2_000_000: raise ValueError('Invalid request size.')
            payload = json.loads(self.rfile.read(length))
            path = urlparse(self.path).path
            if path == '/api/calendar' and self.command == 'POST':
                sessions = validate_sessions(payload.get('sessions'))
                self.respond(200, run_bridge({'action':'write','sessions':sessions}))
            elif path == '/api/progress' and self.command == 'PUT':
                state = payload.get('state')
                if not isinstance(state, dict) or state.get('version') != 1 or not isinstance(state.get('completed'), dict) or not isinstance(state.get('mistakes'), list) or not isinstance(state.get('preferences'), dict):
                    raise ValueError('Invalid progress data.')
                with LOCK:
                    current = progress_read()
                    if payload.get('revision') != current['revision']:
                        self.respond(409, {'error':'Another device updated progress. Export this device’s backup, then reload to retrieve the latest shared version.'}); return
                    next_value = {'revision':current['revision']+1,'state':state}
                    temp = PRIVATE / 'progress.tmp'
                    temp.write_text(json.dumps(next_value))
                    temp.chmod(0o600)
                    os.replace(temp,PROGRESS)
                    self.respond(200, {'revision':next_value['revision']})
            else: self.respond(404, {'error':'Unknown endpoint.'})
        except (ValueError, TypeError) as e:
            self.respond(400, {'error':str(e)})
        except Exception as e:
            self.respond(503, {'error':str(e)})

    do_POST = write_request
    do_PUT = write_request

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--share', action='store_true', help='Allow devices on your trusted local Wi-Fi to open the app.')
    parser.add_argument('--open', action='store_true', help='Open the private local launch link in your browser.')
    args = parser.parse_args()
    server = ThreadingHTTPServer(('0.0.0.0' if args.share else '127.0.0.1', args.port), Handler)
    local_url = f'http://localhost:{args.port}/#access={TOKEN}'
    (PRIVATE / 'launch-url').write_text(local_url)
    (PRIVATE / 'launch-url').chmod(0o600)
    print(f'FORGE is running on http://localhost:{args.port}/', flush=True)
    print('Open the private launch link in .local/launch-url for shared progress and Apple Calendar.', flush=True)
    if args.share:
        addresses = set()
        for interface in ('en0','en1'):
            try:
                result = subprocess.run(['/usr/sbin/ipconfig','getifaddr',interface],capture_output=True,text=True,timeout=2)
                if result.returncode == 0: addresses.add(result.stdout.strip())
            except (OSError,subprocess.TimeoutExpired): pass
        try: addresses.update(socket.gethostbyname_ex(socket.gethostname())[2])
        except OSError: pass
        phone_urls = [f'http://{ip}:{args.port}/#access={TOKEN}' for ip in addresses if not ip.startswith('127.')]
        (PRIVATE / 'phone-urls').write_text('\n'.join(phone_urls))
        (PRIVATE / 'phone-urls').chmod(0o600)
        print('Phone links are in .local/phone-urls. Share only on trusted Wi-Fi; keep the Mac awake.',flush=True)
    if args.open: webbrowser.open(local_url)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()
