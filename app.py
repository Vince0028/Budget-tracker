import os
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from functools import wraps
from dotenv import load_dotenv
load_dotenv() # This loads variables from .env into os.environ

# Import SQLAlchemy components
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text as sa_text # Renamed to avoid conflict with 'text' type

app = Flask(__name__)
# Load secret key from environment variable for security, or use a default for local dev
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'your-secure-flask-secret-key')

# --- Database Configuration (Supabase PostgreSQL) ---
# Retrieve DATABASE_URL from environment variables
# For local development, you can set this in a .env file or directly here for testing,
# but it MUST be an environment variable in Netlify.
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')

# Optional: Disable SQLAlchemy event system if you don't need it
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --- SQLAlchemy Models ---
# These Python classes represent your database tables.

class User(db.Model):
    __tablename__ = 'users' # Explicitly define table name for clarity
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    username = db.Column(db.Text, unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, default=datetime.now)

    # Define relationships for easier access to related data
    categories = db.relationship('Category', backref='user', lazy=True, cascade="all, delete-orphan")
    transactions = db.relationship('Transaction', backref='user', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f'<User {self.username}>'

class Category(db.Model):
    __tablename__ = 'categories'
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.Text, nullable=False)
    type = db.Column(db.Text, nullable=False) # 'income' or 'expense'
    color = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, default=datetime.now)

    # Note: No 'cascade="all, delete-orphan"' here for transactions
    # because transactions will handle ON DELETE SET NULL for category_id
    transactions = db.relationship('Transaction', backref='category', lazy=True)

    # Add a unique constraint to prevent a user from having two categories with the exact same name
    # This matches the SQL UNIQUE (user_id, name) constraint
    __table_args__ = (db.UniqueConstraint('user_id', 'name', name='_user_name_uc'),)

    def __repr__(self):
        return f'<Category {self.name} ({self.type})>'

class Transaction(db.Model):
    __tablename__ = 'transactions'
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.id'), nullable=False)
    category_id = db.Column(db.BigInteger, db.ForeignKey('categories.id'), nullable=True) # Nullable
    type = db.Column(db.Text, nullable=False) # 'income' or 'expense'
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    description = db.Column(db.Text, nullable=True)
    date = db.Column(db.TIMESTAMP(timezone=True), nullable=False, default=datetime.now)
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, default=datetime.now)

    def __repr__(self):
        return f'<Transaction {self.type} {self.amount}>'

# --- Jinja2 Custom Filters ---
@app.template_filter('datetimeformat')
def datetimeformat(value, format='%B %d, %Y'):
    if not value:
        return ""
    # Ensure value is a datetime object, then format
    if isinstance(value, str):
        # Handle ISO format strings which might come from the DB
        try:
            dt_object = datetime.fromisoformat(value.replace('Z', '+00:00'))
        except ValueError:
            # Fallback for other potential string formats if necessary
            return value
    else:
        dt_object = value
    return dt_object.strftime(format)

# --- Login Required Decorator ---
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
@login_required
def index():
    return redirect(url_for('dashboard'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        # Check if username already exists
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            flash('Username already exists. Please choose a different one.', 'danger')
            return redirect(url_for('register'))

        hashed_password = generate_password_hash(password)
        new_user = User(username=username, password_hash=hashed_password, created_at=datetime.now())
        db.session.add(new_user)
        try:
            db.session.commit()
            flash('Registration successful! Please log in.', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            db.session.rollback()
            flash(f'An error occurred during registration: {e}', 'danger')
            return redirect(url_for('register'))
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        user = User.query.filter_by(username=username).first()

        if user and check_password_hash(user.password_hash, password):
            session['user_id'] = user.id
            session['username'] = user.username # Store username in session
            flash('Login successful!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid username or password.', 'danger')
            return redirect(url_for('login'))
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    session.pop('user_id', None)
    session.pop('username', None) # Remove username from session
    flash('You have been logged out.', 'info')
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    user_id = session['user_id']
    
    # Calculate total income and expenses for all time
    total_income = db.session.query(db.func.sum(Transaction.amount))\
        .filter(Transaction.user_id == user_id, Transaction.type == 'income')\
        .scalar() or 0

    total_expense = db.session.query(db.func.sum(Transaction.amount))\
        .filter(Transaction.user_id == user_id, Transaction.type == 'expense')\
        .scalar() or 0

    return render_template('dashboard.html', total_income=float(total_income), total_expense=float(total_expense))


@app.route('/add_transaction', methods=['POST'])
@login_required
def add_transaction():
    user_id = session['user_id']
    transaction_type = request.form['type']
    category_id = request.form.get('category_id') # Can be None if uncategorized
    amount = float(request.form['amount'])
    description = request.form['description']
    date_str = request.form['date']

    # Convert date string to datetime object
    try:
        transaction_date = datetime.strptime(date_str, '%Y-%m-%d')
    except ValueError:
        flash('Invalid date format. Please use YYYY-MM-DD.', 'danger')
        return redirect(url_for('income') if transaction_type == 'income' else url_for('expense'))

    # Ensure category_id is None if empty string (for nullable foreign key)
    if not category_id:
        category_id = None
    else:
        category_id = int(category_id) # Convert to int

    new_transaction = Transaction(
        user_id=user_id,
        category_id=category_id,
        type=transaction_type,
        amount=amount,
        description=description,
        date=transaction_date,
        created_at=datetime.now()
    )
    db.session.add(new_transaction)
    try:
        db.session.commit()
        flash(f'{transaction_type.capitalize()} added successfully!', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'An error occurred: {e}', 'danger')

    return redirect(url_for('income') if transaction_type == 'income' else url_for('expense'))


@app.route('/income')
@login_required
def income():
    user_id = session['user_id']
    income_categories = Category.query.filter_by(user_id=user_id, type='income').all()
    # Fetch all categories to pass to JS for dropdown (can be filtered by type on frontend)
    all_categories = Category.query.filter_by(user_id=user_id).all()
    return render_template('income.html', categories=income_categories, all_categories=[c.to_dict() for c in all_categories])

@app.route('/expense')
@login_required
def expense():
    user_id = session['user_id']
    expense_categories = Category.query.filter_by(user_id=user_id, type='expense').all()
    # Fetch all categories to pass to JS for dropdown (can be filtered by type on frontend)
    all_categories = Category.query.filter_by(user_id=user_id).all()
    return render_template('expense.html', categories=expense_categories, all_categories=[c.to_dict() for c in all_categories])


@app.route('/history')
@login_required
def history():
    user_id = session['user_id']
    
    # Fetch all transactions and categories for the logged-in user
    transactions = Transaction.query.filter_by(user_id=user_id).order_by(Transaction.date.desc(), Transaction.created_at.desc()).all()
    categories = Category.query.filter_by(user_id=user_id).all()

    # Create a dictionary for quick category lookup by ID
    category_map = {c.id: c for c in categories}

    # Prepare transactions data for the template, including category name and color
    transactions_for_template = []
    for t in transactions:
        category_name = None
        category_color = None
        if t.category_id and t.category_id in category_map:
            category_name = category_map[t.category_id].name
            category_color = category_map[t.category_id].color
        transactions_for_template.append({
            'id': t.id,
            'user_id': t.user_id,
            'category_id': t.category_id,
            'category_name': category_name,
            'category_color': category_color,
            'type': t.type,
            'amount': float(t.amount), # Convert Decimal to float for JSON/template
            'description': t.description,
            'date': t.date.isoformat(), # Convert datetime to ISO string for JS
            'created_at': t.created_at.isoformat()
        })
    
    # Pass all categories to the template for the edit modal dropdown (to be used by JS)
    all_categories = Category.query.filter_by(user_id=user_id).all()
    all_categories_for_js = [{'id': c.id, 'name': c.name, 'type': c.type, 'color': c.color} for c in all_categories]


    return render_template('history.html', transactions=transactions_for_template, all_categories=all_categories_for_js)


@app.route('/edit_transaction/<int:transaction_id>', methods=['POST'])
@login_required
def edit_transaction(transaction_id):
    user_id = session['user_id']
    transaction = Transaction.query.filter_by(id=transaction_id, user_id=user_id).first()

    if not transaction:
        flash('Transaction not found or you do not have permission to edit it.', 'danger')
        return redirect(url_for('history'))

    transaction.category_id = request.form.get('category_id')
    # Ensure category_id is None if empty string (for nullable foreign key)
    if not transaction.category_id:
        transaction.category_id = None
    else:
        transaction.category_id = int(transaction.category_id) # Convert to int

    transaction.amount = float(request.form['amount'])
    transaction.description = request.form['description']
    transaction.date = datetime.strptime(request.form['date'], '%Y-%m-%d')
    transaction.type = request.form['type'] # Update type as well if allowed by the form

    try:
        db.session.commit()
        flash('Transaction updated successfully!', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'An error occurred: {e}', 'danger')
    
    return redirect(url_for('history'))


@app.route('/delete_transaction/<int:transaction_id>', methods=['POST'])
@login_required
def delete_transaction(transaction_id):
    user_id = session['user_id']
    transaction = Transaction.query.filter_by(id=transaction_id, user_id=user_id).first()

    if not transaction:
        flash('Transaction not found or you do not have permission to delete it.', 'danger')
        return redirect(url_for('history'))

    db.session.delete(transaction)
    try:
        db.session.commit()
        flash('Transaction deleted successfully!', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'An error occurred: {e}', 'danger')
    
    return redirect(url_for('history'))

@app.route('/categories')
@login_required
def categories():
    user_id = session['user_id']
    all_categories = Category.query.filter_by(user_id=user_id).order_by(Category.name).all()
    return render_template('categories.html', categories=all_categories)

@app.route('/add_category', methods=['POST'])
@login_required
def add_category():
    user_id = session['user_id']
    name = request.form['name'].strip()
    category_type = request.form['type']
    color = request.form['color']

    # Check for duplicate category name for the same user and type
    existing_category = Category.query.filter_by(user_id=user_id, name=name, type=category_type).first()
    if existing_category:
        flash(f'A {category_type} category with the name "{name}" already exists.', 'danger')
        return redirect(url_for('categories'))

    new_category = Category(user_id=user_id, name=name, type=category_type, color=color, created_at=datetime.now())
    db.session.add(new_category)
    try:
        db.session.commit()
        flash(f'Category "{name}" added successfully!', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'An error occurred: {e}', 'danger')
    
    return redirect(url_for('categories'))

@app.route('/edit_category/<int:category_id>', methods=['POST'])
@login_required
def edit_category(category_id):
    user_id = session['user_id']
    category = Category.query.filter_by(id=category_id, user_id=user_id).first()

    if not category:
        flash('Category not found or you do not have permission to edit it.', 'danger')
        return redirect(url_for('categories'))

    name = request.form['name'].strip()
    category_type = request.form['type']
    color = request.form['color']

    # Check for duplicate name if the name or type changed, excluding the current category
    existing_category = Category.query.filter(
        Category.user_id == user_id,
        Category.name == name,
        Category.type == category_type,
        Category.id != category_id
    ).first()

    if existing_category:
        flash(f'A {category_type} category with the name "{name}" already exists for this type.', 'danger')
        return redirect(url_for('categories'))

    category.name = name
    category.type = category_type
    category.color = color

    try:
        db.session.commit()
        flash('Category updated successfully!', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'An error occurred: {e}', 'danger')
    
    return redirect(url_for('categories'))

@app.route('/delete_category/<int:category_id>', methods=['POST'])
@login_required
def delete_category(category_id):
    user_id = session['user_id']
    category = Category.query.filter_by(id=category_id, user_id=user_id).first()

    if not category:
        flash('Category not found or you do not have permission to delete it.', 'danger')
        return redirect(url_for('categories'))

    # If ON DELETE SET NULL is configured for transactions.category_id,
    # associated transactions will automatically have their category_id set to NULL.
    # No manual update here is needed if FK is set up correctly.

    db.session.delete(category)
    try:
        db.session.commit()
        flash('Category deleted successfully!', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'An error occurred: {e}', 'danger')
    
    return redirect(url_for('categories'))

@app.route('/account')
@login_required
def account():
    user_id = session['user_id']
    user = User.query.filter_by(id=user_id).first()

    if not user:
        flash('User not found.', 'danger')
        return redirect(url_for('login'))

    # Calculate total income and expenses for all time for the user
    all_time_income = db.session.query(db.func.sum(Transaction.amount))\
        .filter(Transaction.user_id == user_id, Transaction.type == 'income')\
        .scalar() or 0.0

    all_expense = db.session.query(db.func.sum(Transaction.amount))\
        .filter(Transaction.user_id == user_id, Transaction.type == 'expense')\
        .scalar() or 0.0

    # Get number of transactions
    total_transactions = Transaction.query.filter_by(user_id=user_id).count()

    # Get user creation date
    member_since = user.created_at

    return render_template('account.html',
                           total_income=float(all_time_income),
                           total_expense=float(all_expense),
                           total_transactions=total_transactions,
                           member_since=member_since)

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.route('/get_transactions_data')
@login_required
def get_transactions_data():
    user_id = session['user_id']
    period = request.args.get('period', 'month')
    data_type = request.args.get('dataType', 'expense') # 'expense' or 'income' or 'both'

    end_date = datetime.now()
    if period == 'today':
        start_date = end_date.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == 'week':
        start_date = end_date - timedelta(days=end_date.weekday()) # Monday of current week
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == 'month':
        start_date = end_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == 'year':
        start_date = end_date.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else: # 'all'
        start_date = datetime.min # Or a very early date, e.g., datetime(2000, 1, 1)

    # Base query filters
    base_filters = [
        Transaction.user_id == user_id,
        Transaction.date >= start_date,
        Transaction.date <= end_date
    ]

    if data_type != 'both': # Add type filter only if not 'both'
        base_filters.append(Transaction.type == data_type)

    # Group by category and sum amounts
    results = db.session.query(
        Category.name,
        Category.color,
        db.func.sum(Transaction.amount).label('total_amount')
    ).outerjoin(Category, Transaction.category_id == Category.id)\
    .filter(*base_filters)\
    .group_by(Category.name, Category.color)\
    .all()

    # Handle uncategorized transactions separately
    # This filter also needs to respect the data_type if not 'both'
    uncategorized_query = db.session.query(
        db.func.sum(Transaction.amount)
    ).filter(
        Transaction.user_id == user_id,
        Transaction.date >= start_date,
        Transaction.date <= end_date,
        Transaction.category_id.is_(None) # Filter for NULL category_id
    )
    if data_type != 'both':
        uncategorized_query = uncategorized_query.filter(Transaction.type == data_type)

    uncategorized_sum = uncategorized_query.scalar() or 0.0


    chart_data = []
    labels = []
    amounts = []
    colors = []

    for name, color, total_amount in results:
        if name:
            labels.append(name)
            amounts.append(float(total_amount))
            colors.append(color)

    if uncategorized_sum > 0:
        labels.append('Uncategorized')
        amounts.append(float(uncategorized_sum))
        colors.append('#CCCCCC') # Default gray for uncategorized

    # Prepare data for Chart.js
    chart_js_data = {
        'labels': labels,
        'datasets': [{
            'data': amounts,
            'backgroundColor': colors,
            'hoverOffset': 4
        }]
    }

    # Prepare legend data for custom legend
    legend_data = []
    for i in range(len(labels)):
        legend_data.append({
            'name': labels[i],
            'color': colors[i],
            'value': amounts[i]
        })
    
    # Sort legend data by value (descending)
    legend_data.sort(key=lambda x: x['value'], reverse=True)


    return jsonify(chartData=chart_js_data, legendData=legend_data)


@app.route('/get_transactions_bar_data')
@login_required
def get_transactions_bar_data():
    user_id = session['user_id']
    period = request.args.get('period', 'month')
    data_type = request.args.get('dataType', 'expense') # 'expense' or 'income' or 'both'

    end_date = datetime.now()
    if period == 'today':
        start_date = end_date.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == 'week':
        start_date = end_date - timedelta(days=end_date.weekday())
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == 'month':
        start_date = end_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == 'year':
        start_date = end_date.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else: # 'all'
        start_date = datetime.min

    # Base query filters
    base_filters = [
        Transaction.user_id == user_id,
        Transaction.date >= start_date,
        Transaction.date <= end_date
    ]

    if data_type != 'both': # Add type filter only if not 'both'
        base_filters.append(Transaction.type == data_type)


    if period == 'today': # Group by hour
        raw_data = db.session.query(
            db.func.date_trunc('hour', Transaction.date).label('hour'),
            db.func.sum(Transaction.amount).label('total')
        ).filter(*base_filters)\
        .group_by(db.func.date_trunc('hour', Transaction.date))\
        .order_by('hour')\
        .all()
        # Create a full list of hours for labels
        full_labels = [datetime.now().replace(hour=h, minute=0, second=0, microsecond=0).strftime('%H:00') for h in range(24)]
        data_map = {item.hour.strftime('%H:00'): float(item.total) for item in raw_data}
        amounts = [data_map.get(label, 0) for label in full_labels]
        labels = full_labels

    elif period == 'week': # Group by day of week
        raw_data = db.session.query(
            db.func.date_trunc('day', Transaction.date).label('day'),
            db.func.sum(Transaction.amount).label('total')
        ).filter(*base_filters)\
        .group_by(db.func.date_trunc('day', Transaction.date))\
        .order_by('day')\
        .all()
        # Create a full list of days for labels (Mon-Sun)
        current_week_days = [(start_date + timedelta(days=i)).strftime('%a %d') for i in range(7)]
        data_map = {item.day.strftime('%a %d'): float(item.total) for item in raw_data}
        amounts = [data_map.get(label, 0) for label in current_week_days]
        labels = current_week_days

    elif period == 'month': # Group by day of month
        raw_data = db.session.query(
            db.func.date_trunc('day', Transaction.date).label('day'),
            db.func.sum(Transaction.amount).label('total')
        ).filter(*base_filters)\
        .group_by(db.func.date_trunc('day', Transaction.date))\
        .order_by('day')\
        .all()
        # Create a full list of days for labels
        num_days = (end_date - start_date).days + 1
        full_labels = [(start_date + timedelta(days=i)).strftime('%d') for i in range(num_days)]
        data_map = {item.day.strftime('%d'): float(item.total) for item in raw_data}
        amounts = [data_map.get(label, 0) for label in full_labels]
        labels = full_labels

    elif period == 'year': # Group by month of year
        raw_data = db.session.query(
            db.func.date_trunc('month', Transaction.date).label('month'),
            db.func.sum(Transaction.amount).label('total')
        ).filter(*base_filters)\
        .group_by(db.func.date_trunc('month', Transaction.date))\
        .order_by('month')\
        .all()
        # Create a full list of months for labels
        full_labels = [datetime(end_date.year, m, 1).strftime('%b') for m in range(1, 13)]
        data_map = {item.month.strftime('%b'): float(item.total) for item in raw_data}
        amounts = [data_map.get(label, 0) for label in full_labels]
        labels = full_labels

    else: # 'all' - Group by year
        raw_data = db.session.query(
            db.func.date_trunc('year', Transaction.date).label('year'),
            db.func.sum(Transaction.amount).label('total')
        ).filter(*base_filters)\
        .group_by(db.func.date_trunc('year', Transaction.date))\
        .order_by('year')\
        .all()
        labels = [str(int(item.year.year)) for item in raw_data] # Extract year as integer
        amounts = [float(item.total) for item in raw_data]

    # For 'both' income and expense, if bar chart needs a unified color, you might pick a neutral one
    # or handle it in the frontend. For now, it will use the expense color by default, which can be adjusted.
    # A more sophisticated approach for 'both' might involve two datasets or a different visualization.
    # For now, if data_type is 'both', we'll just use a default color, as we can't easily assign
    # income/expense specific colors to combined bars without more complex logic.
    chart_js_data = {
        'labels': labels,
        'datasets': [{
            'label': f'{data_type.capitalize()} by {period}',
            'data': amounts,
            'backgroundColor': '#fc5723' if data_type == 'expense' else ('#28a745' if data_type == 'income' else '#6c757d'), # Neutral gray for 'both'
            'borderColor': '#fc5723' if data_type == 'expense' else ('#28a745' if data_type == 'income' else '#6c757d'),
            'borderWidth': 1
        }]
    }

    return jsonify(chartData=chart_js_data)

# Helper to convert category object to dict for JSON serialization
# (Used in income/expense/history templates to pass categories to JS)
def category_to_dict(self):
    return {
        'id': self.id,
        'name': self.name,
        'type': self.type,
        'color': self.color
    }

# Dynamically add to_dict method to Category model
Category.to_dict = category_to_dict


if __name__ == '__main__':
    # When running locally, ensure tables are created (only if you don't use migrations)
    # For production with Alembic, you would run 'alembic upgrade head'
    # with app.app_context():
    #     db.create_all() # This creates tables based on models - use with caution in production!
    app.run(debug=True)
