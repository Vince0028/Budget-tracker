import os
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash
from werkzeug.security import generate_password_hash, check_password_hash
import json
from datetime import datetime, timedelta
from functools import wraps

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'  # Change this to a secure secret key

# --- Jinja2 Custom Filters ---
@app.template_filter('datetimeformat')
def datetimeformat(value, format='%B %d, %Y'):
    if not value:
        return ""
    # Assuming value is an ISO-formatted string
    dt_object = datetime.fromisoformat(value)
    return dt_object.strftime(format)

# --- JSON Database Configuration ---
DB_FILE = 'budget_tracker.json'

# In-memory representation of the database
db_data = {
    'users': [],
    'categories': [],
    'transactions': []
}

# --- Database Helper Functions (JSON) ---

def _get_next_id(collection_name):
    """Generates the next unique ID for a given collection."""
    # Ensure id generation is robust even if a collection is empty
    current_ids = [item['id'] for item in db_data[collection_name]]
    return max(current_ids + [0]) + 1

def _load_db():
    global db_data
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, 'r') as f:
                db_data = json.load(f)
            print(f"DEBUG: Successfully loaded data from {DB_FILE}")
        except json.JSONDecodeError:
            # Handle empty or malformed JSON file
            db_data = {
                'users': [],
                'categories': [],
                'transactions': []
            }
            print(f"Warning: {DB_FILE} was empty or malformed. Initializing with empty data.")
    else:
        # Initialize with empty lists if file doesn't exist
        db_data = {
                'users': [],
                'categories': [],
                'transactions': []
            }
        print(f"Warning: {DB_FILE} not found. Initializing with empty data and creating file.")
    _save_db() # Ensure the file is created if it didn't exist, or re-saved if malformed

def _save_db():
    try:
        with open(DB_FILE, 'w') as f:
            json.dump(db_data, f, indent=4)
        print(f"DEBUG: Successfully saved data to {DB_FILE}")
    except (IOError, OSError) as e:
        print(f"ERROR: Could not save database to {DB_FILE}: {e}")
        flash(f"Error saving data: {e}. Please check file permissions.", "danger")

# --- Authentication Decorator ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in to access this page.', 'danger')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# --- Routes ---

@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        user = next((u for u in db_data['users'] if u['username'] == username), None)

        if user and check_password_hash(user['password_hash'], password):
            session['user_id'] = user['id']
            session['username'] = user['username']
            flash('Logged in successfully!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid username or password.', 'danger')
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        confirm_password = request.form['confirm_password']

        if password != confirm_password:
            flash('Passwords do not match.', 'danger')
            return render_template('register.html')

        if any(u['username'] == username for u in db_data['users']):
            flash('Username already exists.', 'danger')
            return render_template('register.html')

        new_user_id = _get_next_id('users')
        new_user = {
            'id': new_user_id,
            'username': username,
            'email': email,
            'password_hash': generate_password_hash(password),
            'created_at': datetime.now().isoformat()
        }
        db_data['users'].append(new_user)

        # Generate initial ID based on current max categories ID
        # _get_next_id will handle this for us
        
        default_categories_data = [
            {'name': 'Salary', 'type': 'income', 'color': '#28a745'},
            {'name': 'Food', 'type': 'expense', 'color': '#dc3545'},
            {'name': 'Transportation', 'type': 'expense', 'color': '#ffc107'},
            {'name': 'Utilities', 'type': 'expense', 'color': '#6c757d'},
            {'name': 'Entertainment', 'type': 'expense', 'color': '#17a2b8'}
        ]

        for cat_data in default_categories_data:
            new_category = {
                'id': _get_next_id('categories'), # Use _get_next_id here
                'user_id': new_user_id,
                'name': cat_data['name'],
                'type': cat_data['type'],
                'color': cat_data['color']
            }
            db_data['categories'].append(new_category)

        _save_db()
        flash('Registration successful! Please log in.', 'success')
        return redirect(url_for('login'))
    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    session.pop('user_id', None)
    session.pop('username', None)
    flash('You have been logged out.', 'info')
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    user_id = session['user_id']
    user_transactions = [t for t in db_data['transactions'] if t['user_id'] == user_id]

    total_income = sum(t['amount'] for t in user_transactions if t['type'] == 'income')
    total_expense = sum(t['amount'] for t in user_transactions if t['type'] == 'expense')

    return render_template('dashboard.html',
                           total_income=total_income,
                           total_expense=total_expense)

@app.route('/income')
@login_required
def income():
    user_id = session['user_id']
    income_categories = [c for c in db_data['categories'] if c['user_id'] == user_id and c['type'] == 'income']
    return render_template('income.html', income_categories=income_categories)

@app.route('/expense')
@login_required
def expense():
    user_id = session['user_id']
    expense_categories = [c for c in db_data['categories'] if c['user_id'] == user_id and c['type'] == 'expense']
    return render_template('expense.html', expense_categories=expense_categories)

@app.route('/add_transaction', methods=['POST'])
@login_required
def add_transaction():
    user_id = session['user_id']
    amount = float(request.form['amount'])
    category_id = int(request.form['category_id'])
    transaction_type = request.form['type']
    date_str = request.form['date']
    description = request.form['description']

    category = next((c for c in db_data['categories'] if c['id'] == category_id and c['user_id'] == user_id), None)
    if not category:
        flash('Invalid category selected.', 'danger')
        return redirect(url_for('dashboard'))

    new_transaction_id = _get_next_id('transactions')
    new_transaction = {
        'id': new_transaction_id,
        'user_id': user_id,
        'amount': amount,
        'category_id': category_id,
        'category_name': category['name'], # Store name for easier display
        'category_color': category['color'], # Store color for easier display in history
        'type': transaction_type,
        'date': date_str,
        'description': description,
        'created_at': datetime.now().isoformat()
    }
    db_data['transactions'].append(new_transaction)
    _save_db()
    flash(f'{transaction_type.capitalize()} added successfully!', 'success')
    return redirect(url_for('dashboard'))

@app.route('/history')
@login_required
def history():
    user_id = session['user_id']
    user_transactions = [t for t in db_data['transactions'] if t['user_id'] == user_id]

    # Enhance transactions with category name and color if not already present
    for transaction in user_transactions:
        if 'category_id' in transaction and transaction['category_id'] is not None:
            category = next((c for c in db_data['categories'] if c['id'] == transaction['category_id'] and c['user_id'] == user_id), None)
            if category:
                if 'category_name' not in transaction or transaction['category_name'] is None:
                    transaction['category_name'] = category['name']
                if 'category_color' not in transaction or transaction['category_color'] is None:
                    transaction['category_color'] = category['color']
            else:
                # Handle case where category_id exists but category is not found (e.g., deleted category)
                transaction['category_name'] = 'Uncategorized'
                transaction['category_color'] = '#6c757d' # A default neutral color
        else:
            # Handle uncategorized transactions
            transaction['category_name'] = 'Uncategorized'
            transaction['category_color'] = '#6c757d' # A default neutral color

    # Sort transactions by date, most recent first
    user_transactions.sort(key=lambda x: datetime.fromisoformat(x['date']), reverse=True)
    return render_template('history.html', transactions=user_transactions)

# Only allow POST requests for editing from the modal
@app.route('/edit_transaction/<int:transaction_id>', methods=['POST'])
@login_required
def edit_transaction(transaction_id):
    user_id = session['user_id']
    transaction_to_edit = next((t for t in db_data['transactions'] if t['id'] == transaction_id and t['user_id'] == user_id), None)

    if not transaction_to_edit:
        flash('Transaction not found or unauthorized.', 'danger')
        return redirect(url_for('history')) # Redirect back if GET or invalid ID

    try:
        transaction_to_edit['amount'] = float(request.form['amount'])
        transaction_to_edit['description'] = request.form['description']
        transaction_to_edit['date'] = request.form['date'] # Update date
        new_category_id = request.form['category_id']
        transaction_type = request.form['type'] # Get type from modal hidden input

        if new_category_id:
            new_category = next((c for c in db_data['categories'] if c['id'] == int(new_category_id) and c['user_id'] == user_id and c['type'] == transaction_type), None)
            if new_category:
                transaction_to_edit['category_id'] = new_category['id']
                transaction_to_edit['category_name'] = new_category['name']
                transaction_to_edit['category_color'] = new_category['color']
            else:
                flash('Invalid category selected.', 'danger')
                return redirect(url_for('history')) # Stay on history page
        else:
            # Handle uncategorized explicitly
            transaction_to_edit['category_id'] = None
            transaction_to_edit['category_name'] = 'Uncategorized'
            transaction_to_edit['category_color'] = '#6c757d'

        _save_db()
        flash('Transaction updated successfully!', 'success')
        return redirect(url_for('history'))
    except ValueError:
        flash('Invalid amount. Please enter a number.', 'danger')
    except Exception as e:
        flash(f'An error occurred: {e}', 'danger')
        
    return redirect(url_for('history')) # Always redirect back to history after attempt


@app.route('/delete_transaction/<int:transaction_id>', methods=['POST'])
@login_required
def delete_transaction(transaction_id):
    user_id = session['user_id']
    global db_data
    
    # Find the index of the transaction to delete
    transaction_index_to_delete = -1
    for i, t in enumerate(db_data['transactions']):
        if t['id'] == transaction_id and t['user_id'] == user_id:
            transaction_index_to_delete = i
            break

    if transaction_index_to_delete != -1:
        deleted_transaction = db_data['transactions'].pop(transaction_index_to_delete)
        _save_db()
        flash(f"{deleted_transaction['type'].capitalize()} transaction deleted successfully!", 'success')
    else:
        flash('Transaction not found or unauthorized.', 'danger')
    
    return redirect(url_for('history'))

@app.route('/categories', methods=['GET', 'POST'])
@login_required
def categories():
    user_id = session['user_id']

    income_categories = [c for c in db_data['categories'] if c['user_id'] == user_id and c['type'] == 'income']
    expense_categories = [c for c in db_data['categories'] if c['user_id'] == user_id and c['type'] == 'expense']
    return render_template('categories.html', income_categories=income_categories, expense_categories=expense_categories)

# New route to handle adding a category
@app.route('/add_category', methods=['POST'])
@login_required
def add_category():
    user_id = session['user_id']
    name = request.form['name']
    category_type = request.form['type']
    color = request.form['color']

    # Basic validation
    if not name or not category_type or not color:
        flash('All fields are required to add a category.', 'danger')
        return redirect(url_for('categories'))

    # Check if category name already exists for this user and type
    if any(c['name'].lower() == name.lower() and c['type'] == category_type and c['user_id'] == user_id for c in db_data['categories']):
        flash(f'Category "{name}" of type "{category_type}" already exists.', 'danger')
        return redirect(url_for('categories'))

    new_category_id = _get_next_id('categories')
    new_category = {
        'id': new_category_id,
        'user_id': user_id,
        'name': name,
        'type': category_type,
        'color': color
    }
    db_data['categories'].append(new_category)
    _save_db()
    flash(f'Category "{name}" added successfully!', 'success')
    return redirect(url_for('categories'))


@app.route('/edit_category/<int:category_id>', methods=['GET', 'POST'])
@login_required
def edit_category(category_id):
    user_id = session['user_id']
    category_to_edit = next((c for c in db_data['categories'] if c['id'] == category_id and c['user_id'] == user_id), None)

    if not category_to_edit:
        flash('Category not found or unauthorized.', 'danger')
        return redirect(url_for('categories'))

    if request.method == 'POST':
        try:
            new_name = request.form['name']
            new_type = request.form['type']
            new_color = request.form['color']

            # Check for duplicate name for the same user and type, excluding the current category being edited
            if any(c['name'].lower() == new_name.lower() and c['type'] == new_type and c['user_id'] == user_id and c['id'] != category_id for c in db_data['categories']):
                flash(f'Category "{new_name}" of type "{new_type}" already exists for this user.', 'danger')
            else:
                category_to_edit['name'] = new_name
                category_to_edit['type'] = new_type
                category_to_edit['color'] = new_color # Update the color

                # Also update category name and color in existing transactions if the category name/color changes
                for transaction in db_data['transactions']:
                    if transaction.get('category_id') == category_id and transaction['user_id'] == user_id:
                        transaction['category_name'] = new_name
                        transaction['category_color'] = new_color
                
                _save_db()
                flash('Category updated successfully!', 'success')
                return redirect(url_for('categories'))
        except Exception as e:
            flash(f'An error occurred: {e}', 'danger')
    
    return render_template('edit_category.html', category=category_to_edit) # You'll need an edit_category.html template

@app.route('/delete_category/<int:category_id>', methods=['POST'])
@login_required
def delete_category(category_id):
    user_id = session['user_id']
    global db_data
    
    # Find the index of the category to delete
    category_index_to_delete = -1
    for i, c in enumerate(db_data['categories']):
        if c['id'] == category_id and c['user_id'] == user_id:
            category_index_to_delete = i
            break

    if category_index_to_delete != -1:
        deleted_category = db_data['categories'].pop(category_index_to_delete)
        
        # Set category_id to None for all transactions that used this category
        for transaction in db_data['transactions']:
            if transaction.get('category_id') == category_id and transaction['user_id'] == user_id:
                transaction['category_id'] = None
                transaction['category_name'] = 'Uncategorized'
                transaction['category_color'] = '#6c757d' # Assign a default color for uncategorized
        
        _save_db()
        flash(f"Category '{deleted_category['name']}' deleted successfully! Associated transactions will be marked as Uncategorized.", 'success')
    else:
        flash('Category not found or unauthorized.', 'danger')
    
    return redirect(url_for('categories'))


@app.route('/get_chart_data/<string:chart_type>', methods=['GET'])
@login_required
def get_chart_data(chart_type):
    user_id = session['user_id']
    period = request.args.get('period', 'month') # Default to 'month'
    mode = request.args.get('mode', 'category') # New: Default to 'category' aggregation

    # Fetch all transactions for the user
    user_transactions = [t for t in db_data['transactions'] if t['user_id'] == user_id]

    end_date = datetime.now()
    start_date = None

    if period == 'today':
        start_date = end_date.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == 'week':
        start_date = end_date - timedelta(days=end_date.weekday()) # Monday of current week
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == 'month':
        start_date = end_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == 'year':
        start_date = end_date.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    # If period is 'all', start_date remains None, fetching all transactions for the type

    filtered_transactions = []
    for t in user_transactions:
        try:
            transaction_date = datetime.fromisoformat(t['date'])
            if start_date is None or transaction_date >= start_date:
                filtered_transactions.append(t)
        except ValueError:
            # Handle cases where 'date' might be malformed
            print(f"Warning: Transaction {t.get('id')} has malformed date: {t.get('date')}")
            continue

    chart_data = []

    if mode == 'individual':
        # Return each transaction as a separate item
        for transaction in filtered_transactions:
            if chart_type == 'all' or transaction['type'] == chart_type:
                # Use description, or a combination of date and category if description is empty
                label = transaction.get('description')
                if not label:
                    label = f"{transaction['date']} - {transaction['category_name']}"
                # For individual transactions, ensure values are positive for pie/bar chart display
                amount_value = abs(transaction['amount']) 

                chart_data.append({
                    'name': label,
                    'value': amount_value,
                    'color': transaction['category_color'] if transaction['category_color'] else '#6c757d',
                    'original_type': transaction['type'] # Keep original type for 'all' mode logic if needed
                })
    else: # mode == 'category' (default aggregation)
        category_summary = {}
        for transaction in filtered_transactions:
            # Check if transaction type matches the requested chart type or if chart_type is 'all'
            if chart_type == 'all' or transaction['type'] == chart_type:
                category_id = transaction.get('category_id')
                if category_id:
                    category = next((c for c in db_data['categories'] if c['id'] == category_id), None)
                    if category:
                        name = category['name']
                        color = category['color'] # Get the category color
                        # For 'all' chart_type, incomes are positive, expenses are negative
                        amount_for_chart = transaction['amount'] if transaction['type'] == 'income' else -transaction['amount']
                        
                        if name not in category_summary:
                            category_summary[name] = {'value': 0, 'color': color, 'type': transaction['type']} # Store original type for 'all' chart
                        
                        # Accumulate value
                        category_summary[name]['value'] += amount_for_chart
                    else:
                        # Handle cases where category might have been deleted but transaction still references it
                        name = 'Uncategorized'
                        color = '#6c757d'
                        amount_for_chart = transaction['amount'] if transaction['type'] == 'income' else -transaction['amount']
                        if name not in category_summary:
                            category_summary[name] = {'value': 0, 'color': color, 'type': transaction['type']}
                        category_summary[name]['value'] += amount_for_chart
                else:
                    # Handle transactions without a category_id (Uncategorized)
                    name = 'Uncategorized'
                    color = '#6c757d'
                    amount_for_chart = transaction['amount'] if transaction['type'] == 'income' else -transaction['amount']
                    if name not in category_summary:
                        category_summary[name] = {'value': 0, 'color': color, 'type': transaction['type']}
                    category_summary[name]['value'] += amount_for_chart

        chart_data = [{'name': name, 'value': summary['value'], 'color': summary['color'], 'type': summary['type']} 
                      for name, summary in category_summary.items()]
        
        # For 'income' and 'expense' specific charts, ensure values are positive for display
        if chart_type != 'all':
            chart_data = [{'name': item['name'], 'value': abs(item['value']), 'color': item['color']} for item in chart_data]

    return jsonify(chart_data)


@app.route('/account')
@login_required
def account():
    user_id = session['user_id']

    user_transactions = [t for t in db_data['transactions'] if t['user_id'] == user_id]
    
    # Get total income for all time
    all_time_income = sum(t['amount'] for t in user_transactions if t['type'] == 'income')

    # Get total expenses for all time
    all_expense = sum(t['amount'] for t in user_transactions if t['type'] == 'expense')

    # Get number of transactions
    total_transactions = len(user_transactions)

    # Get user creation date
    user_info = next((u for u in db_data['users'] if u['id'] == user_id), None)
    member_since = user_info['created_at'] if user_info else 'N/A'
    
    return render_template('account.html',
                           total_income=all_time_income,
                           total_expense=all_expense,
                           total_transactions=total_transactions,
                           member_since=member_since)

# New routes for About Us and Contact Us
@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

# New API endpoint to fetch all categories for JavaScript
@app.route('/get_categories')
@login_required
def get_categories():
    user_id = session['user_id']
    categories_for_user = [c for c in db_data['categories'] if c['user_id'] == user_id]
    return jsonify(categories_for_user)


# --- Initialization ---
if __name__ == '__main__':
    _load_db() # Load database at startup
    app.run(debug=True)
