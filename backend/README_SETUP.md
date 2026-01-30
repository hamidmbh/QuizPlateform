# Backend Setup Instructions

## Prerequisites
- PHP 8.2 or higher
- Composer
- MySQL/PostgreSQL/SQLite database

## Installation Steps

1. **Install Dependencies**
   ```bash
   cd backend
   composer install
   ```

2. **Install Laravel Sanctum**
   ```bash
   php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
   php artisan migrate
   ```

3. **Configure Environment**
   Copy `.env.example` to `.env` (if it doesn't exist) and configure:
   ```env
   APP_NAME="Quiz Platform"
   APP_URL=http://localhost:8000
   
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=quiz_platform
   DB_USERNAME=root
   DB_PASSWORD=
   
   SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost:3000
   SESSION_DOMAIN=localhost
   ```

4. **Generate Application Key**
   ```bash
   php artisan key:generate
   ```

5. **Run Migrations**
   ```bash
   php artisan migrate
   ```

6. **Start the Server**
   ```bash
   php artisan serve
   ```

   The API will be available at `http://localhost:8000/api`

## CORS Configuration

Laravel 12 handles CORS automatically. Make sure your `.env` file has:
```env
SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost:3000
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/me` - Get current user (requires auth)
- `POST /api/auth/logout` - Logout (requires auth)

### Teacher Endpoints (requires TEACHER role)
- `GET /api/classes` - Get all classes
- `POST /api/classes` - Create a class
- `GET /api/classes/{id}/students` - Get students in a class
- `POST /api/classes/{id}/quizzes` - Create a quiz
- `GET /api/quizzes` - Get all quizzes
- `GET /api/quizzes/{id}/submissions` - Get quiz submissions
- `GET /api/submissions/{id}` - Get a submission

### Student Endpoints (requires STUDENT role)
- `GET /api/student/quizzes` - Get available quizzes
- `POST /api/quizzes/{id}/start` - Start a quiz
- `POST /api/quizzes/{id}/submit` - Submit quiz answers

## Testing

Create test users using tinker:
```bash
php artisan tinker
```

```php
// Create a teacher
$teacher = \App\Models\User::create([
    'name' => 'Teacher Name',
    'email' => 'teacher@example.com',
    'password' => bcrypt('password'),
    'role' => 'TEACHER',
]);

// Create a class
$class = \App\Models\ClassModel::create([
    'name' => '1BAC',
    'teacher_id' => $teacher->id,
]);

// Create a student
$student = \App\Models\User::create([
    'name' => 'Student Name',
    'email' => 'student@example.com',
    'password' => bcrypt('password'),
    'role' => 'STUDENT',
    'class_id' => $class->id,
]);
```
