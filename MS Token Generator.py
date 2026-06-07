import requests
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
import urllib.parse
import os

def get_env_val(key):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(script_dir, '.env')
    try:
        with open(env_path, 'r') as f:
            for line in f:
                if line.strip().startswith(f"{key}="):
                    return line.split('=')[1].strip()
    except Exception as e:
        print(f"Debug: Error reading .env at {env_path}: {e}")
        return None
    return None

CLIENT_ID = get_env_val('CLIENT_ID')
TENANT_ID = get_env_val('TENANT_ID')
CLIENT_SECRET = get_env_val('CLIENT_SECRET')

# Fallback in case not found in .env
if not TENANT_ID:
    TENANT_ID = 'common'

REDIRECT_URI = 'http://localhost:8080'

auth_code = None

class OAuthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        global auth_code
        query = urllib.parse.urlparse(self.path).query
        params = urllib.parse.parse_qs(query)
        
        if 'code' in params:
            auth_code = params['code'][0]
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(b"<h1>Success!</h1><p>You can close this window and return to the terminal.</p>")
        else:
            self.send_response(400)
            self.end_headers()

def get_ms_tokens():
    print("--- Microsoft Token Generator ---")
    
    if not CLIENT_ID or not CLIENT_SECRET:
        print("Error: MS_CLIENT_ID or MS_CLIENT_SECRET not found in .env file.")
        return
        
    # 1. Build Authorization URL
    auth_url = (
        f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/authorize?"
        f"client_id={CLIENT_ID}&"
        f"response_type=code&"
        f"redirect_uri={REDIRECT_URI}&"
        f"response_mode=query&"
        f"scope=offline_access%20Files.ReadWrite.All"
    )
    
    print(f"\n1. Opening your browser to authorize...")
    webbrowser.open(auth_url)
    
    # 2. Start local server to catch the code
    server = HTTPServer(('localhost', 8080), OAuthHandler)
    print(f"2. Waiting for authorization on {REDIRECT_URI}...")
    server.handle_request() # This handles exactly one request
    
    if not auth_code:
        print("Error: Did not receive an authorization code.")
        return

    # 3. Exchange code for tokens
    print("\n3. Exchanging code for tokens...")
    token_url = f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token"
    data = {
        'grant_type': 'authorization_code',
        'code': auth_code,
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'redirect_uri': REDIRECT_URI,
        'scope': 'offline_access Files.ReadWrite.All'
    }
    
    response = requests.post(token_url, data=data)
    
    if response.status_code == 200:
        tokens = response.json()
        print("\n✅ SUCCESS!")
        print("-" * 50)
        print(f"MS_REFRESH_TOKEN={tokens.get('refresh_token')}")
        print("-" * 50)
        print("\nUpdate your .env with this token and restart your server.")
    else:
        print(f"\n❌ FAILED TO GET REFRESH TOKEN")
        print(f"Error: {response.status_code}")
        try:
            print(response.json())
        except:
            print(response.text)

if __name__ == '__main__':
    get_ms_tokens()
