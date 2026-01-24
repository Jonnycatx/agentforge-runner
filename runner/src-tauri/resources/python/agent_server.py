#!/usr/bin/env python3
"""
AgentForge Runner - Python Backend Server
Handles AI inference for the desktop app
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.request
import urllib.error
import ssl
import os
import sys

# Configuration
HOST = '127.0.0.1'
PORT = 8765

# Current agent config (loaded from .agentforge file or set via API)
current_config = {
    "name": "AI Assistant",
    "goal": "Help users with various tasks",
    "personality": "You are a helpful, friendly AI assistant.",
    "provider": "ollama",
    "model": "llama3.2",
    "temperature": 0.7,
    "tools": []
}


class RequestHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path == '/health':
            self.send_json_response({'status': 'ok', 'version': '1.0.0'})
        elif self.path == '/config':
            self.send_json_response(current_config)
        else:
            self.send_error(404)

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        try:
            data = json.loads(body.decode('utf-8'))
        except json.JSONDecodeError:
            self.send_error(400, 'Invalid JSON')
            return

        if self.path == '/chat':
            self.handle_chat(data)
        elif self.path == '/config':
            self.handle_config_update(data)
        else:
            self.send_error(404)

    def handle_chat(self, data):
        message = data.get('message', '')
        history = data.get('history', [])
        config = data.get('config', current_config)
        
        provider = config.get('provider', 'ollama')
        model = config.get('model', 'llama3.2')
        api_key = config.get('apiKey', '')
        personality = config.get('personality', 'You are a helpful assistant.')
        temperature = config.get('temperature', 0.7)
        
        messages = [{"role": "system", "content": personality}]
        messages.extend(history)
        messages.append({"role": "user", "content": message})
        
        try:
            if provider == 'ollama':
                response = self.call_ollama(model, messages, temperature)
            elif provider == 'openai':
                response = self.call_openai(model, messages, api_key, temperature)
            elif provider == 'anthropic':
                response = self.call_anthropic(model, messages, api_key, temperature)
            elif provider == 'groq':
                response = self.call_groq(model, messages, api_key, temperature)
            elif provider == 'google':
                response = self.call_google(model, messages, api_key, temperature)
            elif provider == 'xai':
                response = self.call_xai(model, messages, api_key, temperature)
            else:
                response = f"Unknown provider: {provider}"
            
            self.send_json_response({'response': response})
        except Exception as e:
            self.send_json_response({'response': f'Error: {str(e)}'}, status=500)

    def handle_config_update(self, data):
        global current_config
        current_config.update(data)
        self.send_json_response({'status': 'updated'})

    def call_ollama(self, model, messages, temperature):
        url = 'http://localhost:11434/api/chat'
        payload = {
            'model': model,
            'messages': messages,
            'stream': False,
            'options': {'temperature': temperature}
        }
        
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data.get('message', {}).get('content', 'No response')

    def call_openai(self, model, messages, api_key, temperature):
        url = 'https://api.openai.com/v1/chat/completions'
        payload = {
            'model': model,
            'messages': messages,
            'temperature': temperature
        }
        
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}'
            }
        )
        
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, timeout=60, context=ctx) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data['choices'][0]['message']['content']

    def call_anthropic(self, model, messages, api_key, temperature):
        url = 'https://api.anthropic.com/v1/messages'
        
        system_msg = ""
        chat_msgs = []
        for msg in messages:
            if msg['role'] == 'system':
                system_msg = msg['content']
            else:
                chat_msgs.append(msg)
        
        payload = {
            'model': model,
            'max_tokens': 4096,
            'messages': chat_msgs,
            'temperature': temperature
        }
        if system_msg:
            payload['system'] = system_msg
        
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'x-api-key': api_key,
                'anthropic-version': '2023-06-01'
            }
        )
        
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, timeout=60, context=ctx) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data['content'][0]['text']

    def call_groq(self, model, messages, api_key, temperature):
        url = 'https://api.groq.com/openai/v1/chat/completions'
        payload = {
            'model': model,
            'messages': messages,
            'temperature': temperature
        }
        
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}'
            }
        )
        
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, timeout=60, context=ctx) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data['choices'][0]['message']['content']

    def call_google(self, model, messages, api_key, temperature):
        url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}'
        
        contents = []
        for msg in messages:
            if msg['role'] != 'system':
                role = 'user' if msg['role'] == 'user' else 'model'
                contents.append({
                    'role': role,
                    'parts': [{'text': msg['content']}]
                })
        
        payload = {
            'contents': contents,
            'generationConfig': {'temperature': temperature}
        }
        
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, timeout=60, context=ctx) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data['candidates'][0]['content']['parts'][0]['text']

    def call_xai(self, model, messages, api_key, temperature):
        url = 'https://api.x.ai/v1/chat/completions'
        payload = {
            'model': model,
            'messages': messages,
            'temperature': temperature
        }
        
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}'
            }
        )
        
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, timeout=60, context=ctx) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data['choices'][0]['message']['content']

    def send_json_response(self, data, status=200):
        self.send_response(status)
        self.send_cors_headers()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def log_message(self, format, *args):
        pass  # Suppress logging


def main():
    # Check for .agentforge file argument
    if len(sys.argv) > 1:
        config_file = sys.argv[1]
        if os.path.exists(config_file):
            try:
                with open(config_file, 'r') as f:
                    loaded_config = json.load(f)
                    current_config.update(loaded_config)
                    print(f"Loaded agent config: {loaded_config.get('name', 'Unknown')}")
            except Exception as e:
                print(f"Error loading config: {e}")

    print(f"Starting AgentForge Runner backend on {HOST}:{PORT}")
    server = HTTPServer((HOST, PORT), RequestHandler)
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.shutdown()


if __name__ == '__main__':
    main()
