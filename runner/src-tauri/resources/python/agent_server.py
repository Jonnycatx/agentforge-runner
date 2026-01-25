#!/usr/bin/env python3
"""
AgentForge Runner - Python Backend Server
Handles AI inference and tool execution for the desktop app
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.request
import urllib.error
import ssl
import os
import sys
import threading
import time
from typing import Dict, Any, Optional, List
import subprocess
import tempfile

# Configuration
HOST = '127.0.0.1'
PORT = 8765

# Current agent config
current_config = {
    "name": "AI Assistant",
    "goal": "Help users with various tasks",
    "personality": "You are a helpful, friendly AI assistant.",
    "provider": "ollama",
    "model": "llama3.2",
    "temperature": 0.7,
    "tools": [],
    "autonomy_level": 2,
}

# Task queue (in-memory for simple operations)
task_queue: List[Dict] = []
running_tasks: Dict[str, Dict] = {}


class ToolExecutor:
    """Executes tools locally"""
    
    @staticmethod
    def execute(tool_id: str, input_data: Dict, credentials: Optional[Dict] = None) -> Dict:
        """Execute a tool and return the result"""
        try:
            if tool_id == "calculator":
                return ToolExecutor.execute_calculator(input_data)
            elif tool_id == "web_search":
                return ToolExecutor.execute_web_search(input_data, credentials)
            elif tool_id == "file_read":
                return ToolExecutor.execute_file_read(input_data)
            elif tool_id == "file_write":
                return ToolExecutor.execute_file_write(input_data)
            elif tool_id == "code_execute":
                return ToolExecutor.execute_code(input_data)
            elif tool_id == "csv_read":
                return ToolExecutor.execute_csv_read(input_data)
            elif tool_id == "http_request":
                return ToolExecutor.execute_http_request(input_data)
            else:
                return {"success": False, "error": f"Tool '{tool_id}' not implemented locally"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    @staticmethod
    def execute_calculator(input_data: Dict) -> Dict:
        """Execute calculator tool"""
        expression = input_data.get("expression", "")
        operation = input_data.get("operation", "evaluate")
        
        try:
            # Safe evaluation using ast
            import ast
            import operator
            
            # Supported operators
            ops = {
                ast.Add: operator.add,
                ast.Sub: operator.sub,
                ast.Mult: operator.mul,
                ast.Div: operator.truediv,
                ast.Pow: operator.pow,
                ast.USub: operator.neg,
            }
            
            def eval_expr(node):
                if isinstance(node, ast.Num):
                    return node.n
                elif isinstance(node, ast.BinOp):
                    return ops[type(node.op)](eval_expr(node.left), eval_expr(node.right))
                elif isinstance(node, ast.UnaryOp):
                    return ops[type(node.op)](eval_expr(node.operand))
                else:
                    raise TypeError(f"Unsupported type: {type(node)}")
            
            tree = ast.parse(expression, mode='eval')
            result = eval_expr(tree.body)
            
            return {"success": True, "result": result}
        except Exception as e:
            return {"success": False, "error": f"Calculation error: {str(e)}"}
    
    @staticmethod
    def execute_web_search(input_data: Dict, credentials: Optional[Dict] = None) -> Dict:
        """Execute web search (requires API key)"""
        query = input_data.get("query", "")
        num_results = input_data.get("num_results", 5)
        
        # Try Tavily first
        api_key = credentials.get("tavily_api_key") if credentials else os.environ.get("TAVILY_API_KEY")
        if api_key:
            try:
                url = "https://api.tavily.com/search"
                payload = {
                    "api_key": api_key,
                    "query": query,
                    "max_results": num_results,
                }
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode('utf-8'),
                    headers={'Content-Type': 'application/json'}
                )
                ctx = ssl.create_default_context()
                with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
                    data = json.loads(resp.read().decode('utf-8'))
                    return {"success": True, "results": data.get("results", [])}
            except Exception as e:
                return {"success": False, "error": f"Search error: {str(e)}"}
        
        return {"success": False, "error": "No search API key configured"}
    
    @staticmethod
    def execute_file_read(input_data: Dict) -> Dict:
        """Read a local file"""
        path = input_data.get("path", "")
        encoding = input_data.get("encoding", "utf-8")
        
        try:
            # Security: Only allow reading from safe directories
            abs_path = os.path.abspath(path)
            home = os.path.expanduser("~")
            
            if not (abs_path.startswith(home) or abs_path.startswith("/tmp")):
                return {"success": False, "error": "Access denied: Can only read files in home directory"}
            
            with open(abs_path, 'r', encoding=encoding) as f:
                content = f.read()
            
            return {
                "success": True,
                "content": content,
                "path": abs_path,
                "size": len(content),
            }
        except Exception as e:
            return {"success": False, "error": f"File read error: {str(e)}"}
    
    @staticmethod
    def execute_file_write(input_data: Dict) -> Dict:
        """Write to a local file"""
        path = input_data.get("path", "")
        content = input_data.get("content", "")
        mode = input_data.get("mode", "write")  # write or append
        
        try:
            abs_path = os.path.abspath(path)
            home = os.path.expanduser("~")
            
            if not (abs_path.startswith(home) or abs_path.startswith("/tmp")):
                return {"success": False, "error": "Access denied: Can only write files in home directory"}
            
            # Create directory if needed
            os.makedirs(os.path.dirname(abs_path), exist_ok=True)
            
            file_mode = 'a' if mode == 'append' else 'w'
            with open(abs_path, file_mode, encoding='utf-8') as f:
                f.write(content)
            
            return {
                "success": True,
                "path": abs_path,
                "bytes_written": len(content),
            }
        except Exception as e:
            return {"success": False, "error": f"File write error: {str(e)}"}
    
    @staticmethod
    def execute_code(input_data: Dict) -> Dict:
        """Execute Python code in a sandboxed environment"""
        code = input_data.get("code", "")
        timeout = input_data.get("timeout", 30)
        
        try:
            # Create a temporary file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(code)
                temp_path = f.name
            
            try:
                # Run with timeout
                result = subprocess.run(
                    [sys.executable, temp_path],
                    capture_output=True,
                    text=True,
                    timeout=timeout,
                )
                
                return {
                    "success": result.returncode == 0,
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "return_code": result.returncode,
                }
            finally:
                os.unlink(temp_path)
        except subprocess.TimeoutExpired:
            return {"success": False, "error": f"Code execution timed out after {timeout}s"}
        except Exception as e:
            return {"success": False, "error": f"Code execution error: {str(e)}"}
    
    @staticmethod
    def execute_csv_read(input_data: Dict) -> Dict:
        """Read and parse a CSV file"""
        path = input_data.get("path", "")
        delimiter = input_data.get("delimiter", ",")
        
        try:
            import csv
            
            abs_path = os.path.abspath(path)
            
            with open(abs_path, 'r', newline='', encoding='utf-8') as f:
                reader = csv.DictReader(f, delimiter=delimiter)
                rows = list(reader)
            
            return {
                "success": True,
                "data": rows,
                "row_count": len(rows),
                "columns": list(rows[0].keys()) if rows else [],
            }
        except Exception as e:
            return {"success": False, "error": f"CSV read error: {str(e)}"}
    
    @staticmethod
    def execute_http_request(input_data: Dict) -> Dict:
        """Make an HTTP request"""
        url = input_data.get("url", "")
        method = input_data.get("method", "GET").upper()
        headers = input_data.get("headers", {})
        body = input_data.get("body")
        timeout = input_data.get("timeout", 30)
        
        try:
            data = None
            if body:
                if isinstance(body, dict):
                    data = json.dumps(body).encode('utf-8')
                    headers['Content-Type'] = 'application/json'
                else:
                    data = str(body).encode('utf-8')
            
            req = urllib.request.Request(url, data=data, headers=headers, method=method)
            ctx = ssl.create_default_context()
            
            with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
                response_body = resp.read().decode('utf-8')
                
                # Try to parse as JSON
                try:
                    response_body = json.loads(response_body)
                except:
                    pass
                
                return {
                    "success": True,
                    "status_code": resp.status,
                    "headers": dict(resp.headers),
                    "body": response_body,
                }
        except urllib.error.HTTPError as e:
            return {
                "success": False,
                "status_code": e.code,
                "error": str(e),
            }
        except Exception as e:
            return {"success": False, "error": f"HTTP request error: {str(e)}"}


class RequestHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path == '/health':
            self.send_json_response({'status': 'ok', 'version': '2.0.0', 'tools_enabled': True})
        elif self.path == '/config':
            self.send_json_response(current_config)
        elif self.path == '/tasks':
            self.send_json_response(list(running_tasks.values()))
        elif self.path == '/tools':
            # List available tools
            tools = [
                {"id": "calculator", "name": "Calculator", "available": True},
                {"id": "file_read", "name": "File Read", "available": True},
                {"id": "file_write", "name": "File Write", "available": True},
                {"id": "code_execute", "name": "Code Execute", "available": True},
                {"id": "csv_read", "name": "CSV Read", "available": True},
                {"id": "http_request", "name": "HTTP Request", "available": True},
                {"id": "web_search", "name": "Web Search", "available": bool(os.environ.get("TAVILY_API_KEY"))},
            ]
            self.send_json_response(tools)
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
        elif self.path == '/tools/execute':
            self.handle_tool_execute(data)
        elif self.path == '/tasks/submit':
            self.handle_task_submit(data)
        else:
            self.send_error(404)

    def handle_chat(self, data):
        message = data.get('message', '')
        history = data.get('history', [])
        config = data.get('config', current_config)
        tools_to_use = data.get('tools', [])
        
        provider = config.get('provider', 'ollama')
        model = config.get('model', 'llama3.2')
        api_key = config.get('apiKey', '')
        personality = config.get('personality', 'You are a helpful assistant.')
        temperature = config.get('temperature', 0.7)
        goal = config.get('goal', '')
        
        # Build system prompt with tools
        system_content = personality
        if goal:
            system_content += f"\n\nYour goal: {goal}"
        
        if tools_to_use:
            system_content += "\n\nYou have access to the following tools:\n"
            for tool in tools_to_use:
                system_content += f"- {tool}\n"
            system_content += "\nTo use a tool, respond with: [TOOL: tool_name] {\"param\": \"value\"}"
        
        messages = [{"role": "system", "content": system_content}]
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
            
            # Check for tool calls in response
            tool_results = []
            if "[TOOL:" in response:
                response, tool_results = self.process_tool_calls(response, config.get('credentials', {}))
            
            self.send_json_response({
                'response': response,
                'tool_results': tool_results,
            })
        except Exception as e:
            self.send_json_response({'response': f'Error: {str(e)}'}, status=500)

    def process_tool_calls(self, response: str, credentials: Dict) -> tuple:
        """Extract and execute tool calls from response"""
        import re
        
        tool_results = []
        pattern = r'\[TOOL:\s*(\w+)\]\s*(\{[^}]+\})'
        
        matches = re.findall(pattern, response)
        for tool_id, params_str in matches:
            try:
                params = json.loads(params_str)
                result = ToolExecutor.execute(tool_id, params, credentials)
                tool_results.append({
                    "tool": tool_id,
                    "input": params,
                    "result": result,
                })
                
                # Replace tool call with result in response
                old_text = f"[TOOL: {tool_id}] {params_str}"
                new_text = f"[Tool {tool_id} result: {json.dumps(result.get('result', result.get('error', 'No result')))}]"
                response = response.replace(old_text, new_text)
            except Exception as e:
                tool_results.append({
                    "tool": tool_id,
                    "error": str(e),
                })
        
        return response, tool_results

    def handle_tool_execute(self, data):
        """Direct tool execution endpoint"""
        tool_id = data.get('tool_id', '')
        input_data = data.get('input', {})
        credentials = data.get('credentials', {})
        
        result = ToolExecutor.execute(tool_id, input_data, credentials)
        self.send_json_response(result)

    def handle_task_submit(self, data):
        """Submit a task to the queue"""
        task_id = f"task_{int(time.time() * 1000)}"
        task = {
            "id": task_id,
            "type": data.get("type", "chat"),
            "input": data.get("input", {}),
            "status": "pending",
            "created_at": time.time(),
        }
        task_queue.append(task)
        self.send_json_response({"task_id": task_id, "status": "queued"})

    def handle_config_update(self, data):
        global current_config
        current_config.update(data)
        self.send_json_response({'status': 'updated'})

    # AI provider methods (same as before)
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
        
        with urllib.request.urlopen(req, timeout=120) as resp:
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

    print(f"Starting AgentForge Runner backend v2.0 on {HOST}:{PORT}")
    print(f"Tools enabled: calculator, file_read, file_write, code_execute, csv_read, http_request")
    
    server = HTTPServer((HOST, PORT), RequestHandler)
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.shutdown()


if __name__ == '__main__':
    main()
