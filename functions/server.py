# functions/server.py

import os
import sys
import io

# Add your project root directory to the Python path
# This allows 'from app import app' to correctly find your app.py
# Assuming app.py is in the root of your Netlify project (one level up from 'functions').
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import your Flask app instance
# Ensure your Flask app instance in app.py is named 'app' (e.g., app = Flask(__name__))
try:
    from app import app
except ImportError as e:
    print(f"Error importing Flask app from app.py: {e}", file=sys.stderr)
    # This message will appear in Netlify logs if the Flask app cannot be found.
    raise RuntimeError("Flask app (named 'app') not found in 'app.py'. Check your file structure and app instance name.") from e

# This is the main handler function that Netlify Functions calls.
# It takes the incoming HTTP request (event) and context,
# converts it to a WSGI environment, runs your Flask app,
# and then converts the Flask response back for Netlify.
def handler(event, context):
    """
    WSGI wrapper for Flask application running on Netlify Functions.
    """
    # Create a basic WSGI environment dictionary from the Netlify Function 'event'
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

    # Add all headers from the Netlify event to the WSGI environment
    for header_name, header_value in event['headers'].items():
        # Convert header names to WSGI standard (e.g., 'Content-Type' -> 'HTTP_CONTENT_TYPE')
        wsgi_header_name = 'HTTP_' + header_name.upper().replace('-', '_')
        environ[wsgi_header_name] = header_value

    # Prepare for capturing the WSGI application's response
    response_body = io.BytesIO()
    response_headers = []
    response_status = '200 OK'

    # This function is passed to the WSGI app (your Flask app)
    # It captures the status and headers from Flask.
    def start_response(status, headers, exc_info=None):
        nonlocal response_status, response_headers
        response_status = status
        response_headers = headers
        return response_body.write

    # Call your Flask application's WSGI interface
    response_iter = app.wsgi_app(environ, start_response)
    try:
        # Write the response body chunks from Flask's iterator
        for data in response_iter:
            response_body.write(data)
    finally:
        # Close the response iterator if it has a close method
        if hasattr(response_iter, 'close'):
            response_iter.close()

    # Format the collected Flask response into Netlify Function's required output format
    status_code = int(response_status.split(' ')[0])
    
    # Convert list of (key, value) tuples to a dictionary for Netlify headers
    headers_dict = {}
    for k, v in response_headers:
        headers_dict[k] = v

    return {
        'statusCode': status_code,
        'headers': headers_dict,
        'body': response_body.getvalue().decode('utf-8') # Decode body to string for Netlify
    }
