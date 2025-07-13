# Module Module

This module handles module management for syllabi in the Johnson Academy backend.

## Features

- **CRUD Operations**: Create, read, update, and delete modules
- **Role-based Access Control**: Admin-only create/update/delete, all authenticated users can view
- **Syllabus Association**: Modules are linked to specific syllabi
- **Type Classification**: Modules can be theory, technical, or learning types
- **Session Ordering**: Modules are organized by session numbers

## API Endpoints

### Base URL: `/v1/modules`

#### Create Module
- **POST** `/`
- **Permissions**: Admin only (`manageModules`)
- **Body**:
  ```json
  {
    "syllabusId": "syllabus_id_here",
    "type": "theory",
    "title": "Module Title",
    "description": "Module description",
    "session": 1,
    "resources": [
      {
        "file": "file_url_here",
        "key": "resource_key_here"
      }
    ]
  }
  ```

#### Create Multiple Modules (Bulk)
- **POST** `/bulk`
- **Permissions**: Admin only (`manageModules`)
- **Body**: Array of modules (max 100 modules)
  ```json
  [
    {
      "syllabusId": "syllabus_id_here",
      "type": "theory",
      "title": "Module 1 Title",
      "description": "Module 1 description",
      "session": 1,
      "resources": [
        {
          "file": "file_url_here",
          "key": "resource_key_here"
        }
      ]
    },
    {
      "syllabusId": "syllabus_id_here",
      "type": "technical",
      "title": "Module 2 Title",
      "description": "Module 2 description",
      "session": 2,
      "resources": []
    }
  ]
  ```

#### Get All Modules (Paginated)
- **GET** `/`
- **Permissions**: All authenticated users (`getModules`)
- **Query Parameters**:
  - `syllabusId`: Filter by syllabus ID
  - `type`: Filter by module type (theory, technical, learning)
  - `title`: Filter by title
  - `sortBy`: Sort field
  - `limit`: Number of results per page
  - `page`: Page number

#### Get Module by ID
- **GET** `/:moduleId`
- **Permissions**: All authenticated users (`getModules`)

#### Get Module by ID with Syllabus
- **GET** `/:moduleId/with-syllabus`
- **Permissions**: All authenticated users (`getModules`)

#### Update Module
- **PATCH** `/:moduleId`
- **Permissions**: Admin only (`manageModules`)
- **Body**: Any combination of module fields

#### Delete Module
- **DELETE** `/:moduleId`
- **Permissions**: Admin only (`manageModules`)

#### Get Modules by Syllabus
- **GET** `/syllabus/:syllabusId`
- **Permissions**: All authenticated users (`getModules`)

#### Get Modules by Type
- **GET** `/type/:type`
- **Permissions**: All authenticated users (`getModules`)

## Data Model

```typescript
interface IModule {
  syllabusId: mongoose.Types.ObjectId;  // Reference to Syllabus
  type: 'theory' | 'technical' | 'learning';  // Module type
  title: string;                        // Module title
  description: string;                  // Module description
  session: number;                      // Session number for ordering
  resources: Array<{                    // Module resources
    file: string;                       // File URL
    key: string;                        // Resource key
  }>;
}
```

## Permissions

- **Admin**: Full CRUD access (`manageModules`, `getModules`)
- **Teacher**: Read-only access (`getModules`)
- **Student**: Read-only access (`getModules`)

## Validation

All endpoints include comprehensive validation:
- ObjectId validation for references
- Required field validation
- Enum validation for module types
- Session number validation
- Resource array validation
- **Syllabus existence validation**: Ensures syllabusId exists in the database

## Error Responses

```json
// Syllabus not found
{
  "code": 404,
  "message": "Syllabus not found"
}

// Module not found
{
  "code": 404,
  "message": "Module not found"
}

// Invalid module type
{
  "code": 400,
  "message": "Invalid module type. Must be one of: theory, technical, learning"
}
``` 