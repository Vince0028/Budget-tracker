
-- Create User Profiles table
create table user_profiles (
  id uuid references auth.users not null primary key,
  name text,
  email text,
  currency text default 'PHP',
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table user_profiles enable row level security;

create policy "Users can view their own profile" on user_profiles
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on user_profiles
  for update using (auth.uid() = id);

-- Create Transactions table
create table transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  date date not null,
  amount numeric not null,
  category text not null,
  vendor text not null,
  type text not null,
  description text,
  is_recurring boolean default false,
  receipt_data text,
  order_index integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table transactions enable row level security;

create policy "Users can view their own transactions" on transactions
  for select using (auth.uid() = user_id);

create policy "Users can insert their own transactions" on transactions
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own transactions" on transactions
  for update using (auth.uid() = user_id);

create policy "Users can delete their own transactions" on transactions
  for delete using (auth.uid() = user_id);

-- Create Budgets table
create table budgets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  category text not null,
  "limit" numeric not null,
  color text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table budgets enable row level security;

create policy "Users can view their own budgets" on budgets
  for select using (auth.uid() = user_id);

create policy "Users can insert their own budgets" on budgets
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own budgets" on budgets
  for update using (auth.uid() = user_id);

create policy "Users can delete their own budgets" on budgets
  for delete using (auth.uid() = user_id);

-- Create function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create Indexes for Performance
create index transactions_user_id_idx on transactions (user_id);
create index transactions_date_idx on transactions (date);
create index budgets_user_id_idx on budgets (user_id);
