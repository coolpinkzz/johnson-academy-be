# Classes Module

This module handles class management in the Johnson Academy backend. Classes represent specific course sessions with assigned teachers and enrolled students.

## Features

- Create, read, update, and delete classes
- Role-based access control (Admin-only create/update/delete, all authenticated users can view)
- Associate classes with teachers and courses
- Manage student enrollment in classes
- Query classes by teacher, course, or student

## Data Model

```typescript
interface IClasses {
  name: string;                           // Class name
  teacherId: mongoose.Types.ObjectId;     // Reference to User (teacher)
  courseId: mongoose.Types.ObjectId;      // Reference to Course
  students: mongoose.Types.ObjectId[];    // Array of User IDs (students)
  createdAt: Date;                        // Auto-generated timestamp
  updatedAt: Date;                        // Auto-generated timestamp
}
```

## API Endpoints

### Base URL: `/v1/classes`

#### Create Class
- **POST** `/`
- **Permissions**: Admin only (`manageClasses`)
- **Body**:
```json
{
  "name": "Advanced Mathematics 101",
  "teacherId": "64f1a2b3c4d5e6f7g8h9i0j1",
  "courseId": "64f1a2b3c4d5e6f7g8h9i0j2",
  "students": ["64f1a2b3c4d5e6f7g8h9i0j3", "64f1a2b3c4d5e6f7g8h9i0j4"]
}
```

#### Get All Classes (Paginated)
- **GET** `/`
- **Permissions**: All authenticated users (`getClasses`)
- **Query Parameters**:
  - `teacherId`: Filter by teacher ID
  - `courseId`: Filter by course ID
  - `name`: Filter by class name
  - `sortBy`: Sort field
  - `limit`: Number of results per page
  - `page`: Page number

#### Get All Classes (Non-paginated)
- **GET** `/all`
- **Permissions**: All authenticated users (`getClasses`)

#### Get Class by ID
- **GET** `/:classesId`
- **Permissions**: All authenticated users (`getClasses`)

#### Get Classes by Teacher
- **GET** `/teacher/:teacherId`
- **Permissions**: All authenticated users (`getClasses`)

#### Get Classes by Course
- **GET** `/course/:courseId`
- **Permissions**: All authenticated users (`getClasses`)

#### Get Classes by Student
- **GET** `/student/:studentId`
- **Permissions**: All authenticated users (`getClasses`)

#### Update Class
- **PATCH** `/:classesId`
- **Permissions**: Admin only (`manageClasses`)
- **Body**: Any combination of class fields

#### Delete Class
- **DELETE** `/:classesId`
- **Permissions**: Admin only (`manageClasses`)

## Permissions

- **Admin**: Full CRUD access (`manageClasses`, `getClasses`)
- **Teacher**: Read-only access (`getClasses`)
- **Student**: Read-only access (`getClasses`)

## Validation Rules

All endpoints include comprehensive validation:

- **ObjectId validation**: Ensures all references (teacherId, courseId, students) are valid MongoDB ObjectIds
- **Required field validation**: name, teacherId, and courseId are required
- **Role validation**: 
  - teacherId must reference a user with role 'teacher'
  - students array must only contain users with role 'student'
- **Existence validation**: 
  - Ensures teacherId exists in the database
  - Ensures courseId exists in the database
  - Ensures all student IDs exist in the database

## Response Examples

### Successful Class Creation
```json
{
  "_id": "64f1a2b3c4d5e6f7g8h9i0j5",
  "name": "Advanced Mathematics 101",
  "teacherId": {
    "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "name": "Dr. Smith",
    "email": "smith@academy.com",
    "role": "teacher"
  },
  "courseId": {
    "_id": "64f1a2b3c4d5e6f7g8h9i0j2",
    "title": "Advanced Mathematics",
    "description": "Advanced mathematical concepts"
  },
  "students": [
    {
      "_id": "64f1a2b3c4d5e6f7g8h9i0j3",
      "name": "John Doe",
      "email": "john@student.com",
      "role": "student"
    },
    {
      "_id": "64f1a2b3c4d5e6f7g8h9i0j4",
      "name": "Jane Smith",
      "email": "jane@student.com",
      "role": "student"
    }
  ],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Error Handling

The API returns appropriate HTTP status codes:

- `400 Bad Request` - Invalid data or validation errors
- `401 Unauthorized` - Missing authentication
- `403 Forbidden` - Non-admin user attempting to modify classes
- `404 Not Found` - Class, teacher, course, or students not found
- `422 Unprocessable Entity` - Validation errors

## Usage Examples

### Create a New Class
```bash
curl -X POST /v1/classes \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Physics Lab 101",
    "teacherId": "64f1a2b3c4d5e6f7g8h9i0j1",
    "courseId": "64f1a2b3c4d5e6f7g8h9i0j2",
    "students": ["64f1a2b3c4d5e6f7g8h9i0j3", "64f1a2b3c4d5e6f7g8h9i0j4"]
  }'
```

### Get Classes by Teacher
```bash
curl -X GET /v1/classes/teacher/64f1a2b3c4d5e6f7g8h9i0j1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Class
```bash
curl -X PATCH /v1/classes/64f1a2b3c4d5e6f7g8h9i0j5 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Advanced Physics Lab 101",
    "students": ["64f1a2b3c4d5e6f7g8h9i0j3", "64f1a2b3c4d5e6f7g8h9i0j4", "64f1a2b3c4d5e6f7g8h9i0j6"]
  }'
```

### Get Classes by Student
```bash
curl -X GET /v1/classes/student/64f1a2b3c4d5e6f7g8h9i0j3 \
  -H "Authorization: Bearer YOUR_TOKEN"
``` 