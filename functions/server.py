# functions/server.py

import os
import sys
import io

# Add your project root directory to the Python path
# This is crucial so that 'from app import app' can find your main app.py
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import your Flask app instance
try:
    from app import app
except ImportError as e:
    print(f"Error importing Flask app from app.py: {e}", file=sys.stderr)
    raise RuntimeError("Flask app (named 'app') not found in 'app.py'. Check your file structure and app instance name.") from e

# This is the main handler function that Netlify Functions calls.
def handler(event, context):
    """
    WSGI wrapper for Flask application running on Netlify Functions.
    """
    environ = {
        'REQUEST_METHOD': event['httpMethod'],
        'PATH_INFO': event['path'],
        'QUERY_STRING': event.get('queryStringParameters', ''),
        'SERVER_NAME': event['headers'].get('host', 'localhost'),
        'SERVER_PORT': event['headers'].get('x-forwarded-port', '80'),
        'wsgi.version': (1, 0),
        'wsgi.url_scheme': event['headers'].get('x-forwarded-proto', 'http'),
        'wsgi.input': io.BytesIO(event['body'].encode('utf-8')) if event.get('body') else io.BytesIO(b''),
        'wsgi.errors': sys.stderr,
        'wsgi.multithread': True,
        'wsgi.multiprocess': False,
        'wsgi.run_once': False,
        'SERVER_PROTOCOL': 'HTTP/1.1',
    }

    for header_name, header_value in event['headers'].items():
        wsgi_header_name = 'HTTP_' + header_name.upper().replace('-', '_')
        environ[wsgi_header_name] = header_value

    response_body = io.BytesIO()
    response_headers = []
    response_status = '200 OK'

    def start_response(status, headers, exc_info=None):
        nonlocal response_status, response_headers
        response_status = status
        response_headers = headers
        return response_body.write

    response_iter = app.wsgi_app(environ, start_response)
    try:
        for data in response_iter:
            response_body.write(data)
    finally:
        if hasattr(response_iter, 'close'):
            response_iter.close()

    status_code = int(response_status.split(' ')[0])
    
    headers_dict = {}
    for k, v in response_headers:
        headers_dict[k] = v

    return {
        'statusCode': status_code,
        'headers': headers_dict,
        'body': response_body.getvalue().decode('utf-8')
    }
