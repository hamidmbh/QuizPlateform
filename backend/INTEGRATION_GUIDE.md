# Frontend-Backend Integration Guide

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Install dependencies
composer install

# Install Sanctum (if not already installed)
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate

# Configure environment
cp .env.example .env  # or create .env manually
php artisan key:generate

# Update .env with your database settings
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_DATABASE=quiz_platform
# DB_USERNAME=root
# DB_PASSWORD=

# Run migrations
php artisan migrate

# (Optional) Seed test data
php artisan db:seed

# Start server
php artisan serve
```

Backend will run at: `http://localhost:8000`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies (if not already done)
npm install

# Create .env file (if needed)
echo "VITE_API_BASE_URL=http://localhost:8000/api" > .env

# Start development server
npm run dev
```

Frontend will run at: `http://localhost:5173` (or the port Vite assigns)

### 3. CORS Configuration

In `backend/.env`, add:
```env
SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost:3000
SESSION_DOMAIN=localhost
```

## API Endpoints

All endpoints are prefixed with `/api`

### Authentication
- `POST /auth/login` - Login (returns token)
- `GET /me` - Get current user (requires Bearer token)
- `POST /auth/logout` - Logout (requires Bearer token)

### Teacher Endpoints (requires TEACHER role + Bearer token)
- `GET /classes` - List all classes
- `POST /classes` - Create a class
- `GET /classes/{id}/students` - Get students in a class
- `POST /classes/{id}/quizzes` - Create a quiz for a class
- `GET /quizzes` - Get all quizzes created by teacher
- `GET /quizzes/{id}/submissions` - Get submissions for a quiz
- `GET /submissions/{id}` - Get a specific submission

### Student Endpoints (requires STUDENT role + Bearer token)
- `GET /student/quizzes` - Get available quizzes
- `POST /quizzes/{id}/start` - Start a quiz (creates submission)
- `POST /quizzes/{id}/submit` - Submit quiz answers

## Test Credentials

After running `php artisan db:seed`:

**Teacher:**
- Email: `teacher@example.com`
- Password: `password`

**Student:**
- Email: `student1@example.com`
- Password: `password`

## Frontend API Configuration

The frontend is configured to use:
- Base URL: `http://localhost:8000/api` (default)
- Can be overridden with `VITE_API_BASE_URL` environment variable

## Authentication Flow

1. User logs in via `POST /api/auth/login`
2. Backend returns JWT token and user data
3. Frontend stores token in localStorage
4. All subsequent requests include: `Authorization: Bearer {token}`
5. Backend validates token via Sanctum middleware

## Data Models

### User
- `id`, `name`, `email`, `password`, `role` (TEACHER|STUDENT), `class_id`

### Class
- `id`, `name`, `teacher_id`

### Quiz
- `id`, `title`, `description`, `class_id`, `created_by`, `duration_minutes`, `open_at`, `close_at`

### Question
- `id`, `quiz_id`, `text`, `order`

### Option
- `id`, `question_id`, `text`, `is_correct`, `order`

### Submission
- `id`, `quiz_id`, `student_id`, `started_at`, `expires_at`, `submitted_at`, `score`

### Answer
- `id`, `submission_id`, `question_id`, `option_id`

## Troubleshooting

### CORS Issues
- Make sure `SANCTUM_STATEFUL_DOMAINS` includes your frontend URL
- Check that frontend is making requests to the correct backend URL

### Authentication Issues
- Verify token is being sent in `Authorization: Bearer {token}` header
- Check that Sanctum is properly installed and migrated
- Ensure `auth:sanctum` middleware is applied to protected routes

### Database Issues
- Run `php artisan migrate:fresh` to reset database
- Run `php artisan db:seed` to populate test data

## Next Steps

1. Configure your database in `.env`
2. Run migrations: `php artisan migrate`
3. Seed test data: `php artisan db:seed`
4. Start backend: `php artisan serve`
5. Start frontend: `npm run dev` (in frontend directory)
6. Test login with test credentials
7. Create classes and quizzes as a teacher
8. Take quizzes as a student
