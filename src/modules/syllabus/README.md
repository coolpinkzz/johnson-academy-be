# Syllabus Module

This module handles syllabus management with support for three categories of modules: theory, technical, and learning.

## Features

- Create, read, update, and delete syllabi
- Associate modules with syllabi in three categories
- Bulk add modules to syllabi
- Bulk add modules to multiple syllabi

## API Endpoints

### Single Syllabus Operations

#### POST `/v1/syllabi/:syllabusId/bulk-add-modules`
Bulk add modules to a specific syllabus category.

**Authentication:** Admin only

**Request Body:**
```json
{
  "category": "theory|technical|learning",
  "moduleIds": ["moduleId1", "moduleId2", "moduleId3"]
}
```

**Response:**
```json
{
  "_id": "syllabusId",
  "courseId": "courseId",
  "title": "Syllabus Title",
  "description": "Syllabus Description",
  "theory": ["moduleId1", "moduleId2"],
  "technical": ["moduleId3"],
  "learning": ["moduleId4"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Multiple Syllabi Operations

#### POST `/v1/syllabi/bulk-add-modules`
Bulk add modules to multiple syllabi at once.

**Authentication:** Admin only

**Request Body:**
```json
{
  "bulkData": [
    {
      "syllabusId": "syllabusId1",
      "category": "theory",
      "moduleIds": ["moduleId1", "moduleId2"]
    },
    {
      "syllabusId": "syllabusId2",
      "category": "technical",
      "moduleIds": ["moduleId3", "moduleId4"]
    },
    {
      "syllabusId": "syllabusId3",
      "category": "learning",
      "moduleIds": ["moduleId5"]
    }
  ]
}
```

**Response:**
```json
[
  {
    "_id": "syllabusId1",
    "courseId": "courseId1",
    "title": "Syllabus 1",
    "description": "Description 1",
    "theory": ["moduleId1", "moduleId2"],
    "technical": [],
    "learning": [],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "_id": "syllabusId2",
    "courseId": "courseId2",
    "title": "Syllabus 2",
    "description": "Description 2",
    "theory": [],
    "technical": ["moduleId3", "moduleId4"],
    "learning": [],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

## Module Categories

The syllabus supports three categories for organizing modules:

1. **Theory** - Theoretical concepts and foundational knowledge
2. **Technical** - Practical technical skills and hands-on exercises
3. **Learning** - Learning activities, assessments, and educational content

## Validation Rules

- All module IDs must be valid MongoDB ObjectIds
- All modules must exist in the database
- Category must be one of: "theory", "technical", "learning"
- Duplicate module IDs within the same category are automatically filtered out
- At least one module ID must be provided

## Error Handling

The API returns appropriate HTTP status codes:

- `400 Bad Request` - Invalid category or all modules already exist
- `401 Unauthorized` - Missing authentication
- `403 Forbidden` - Non-admin user attempting to modify syllabi
- `404 Not Found` - Syllabus or modules not found
- `422 Unprocessable Entity` - Validation errors

## Usage Examples

### Adding Theory Modules to a Syllabus
```bash
curl -X POST /v1/syllabi/64f1a2b3c4d5e6f7g8h9i0j1/bulk-add-modules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "theory",
    "moduleIds": ["64f1a2b3c4d5e6f7g8h9i0j2", "64f1a2b3c4d5e6f7g8h9i0j3"]
  }'
```

### Bulk Adding to Multiple Syllabi
```bash
curl -X POST /v1/syllabi/bulk-add-modules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bulkData": [
      {
        "syllabusId": "64f1a2b3c4d5e6f7g8h9i0j1",
        "category": "theory",
        "moduleIds": ["64f1a2b3c4d5e6f7g8h9i0j2"]
      },
      {
        "syllabusId": "64f1a2b3c4d5e6f7g8h9i0j4",
        "category": "technical",
        "moduleIds": ["64f1a2b3c4d5e6f7g8h9i0j5", "64f1a2b3c4d5e6f7g8h9i0j6"]
      }
    ]
  }'
``` 