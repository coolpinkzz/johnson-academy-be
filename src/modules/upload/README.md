# Upload Module

This module provides file upload functionality for images and PDFs using ImageKit.io as the cloud storage provider.

## Features

- File upload with validation (images and PDFs)
- File type and size validation
- Automatic file naming with timestamps
- Folder organization
- Tag support
- File deletion
- File information retrieval

## Configuration

Add the following environment variables to your `.env` file:

```env
IMAGEKIT_PUBLIC_KEY=your_public_key_here
IMAGEKIT_PRIVATE_KEY=your_private_key_here
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_endpoint
```

## API Endpoints

### Upload File

- **POST** `/v1/upload`
- **Authentication**: Required (`uploadFiles` permission)
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `file`: File (required) - supports images and PDFs
  - `folder`: Folder name (optional, default: 'general')
  - `tags`: Comma-separated tags (optional)
  - `useUniqueFileName`: Boolean string (optional, default: 'true')

**Example Request:**

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/image.jpg" \
  -F "folder=profile" \
  -F "tags=avatar,profile" \
  -F "useUniqueFileName=true" \
  http://localhost:3000/v1/upload
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "url": "https://ik.imagekit.io/your_endpoint/profile/image.jpg",
    "fileId": "file_id_from_imagekit",
    "fileName": "image.jpg",
    "filePath": "/profile/image.jpg",
    "fileType": "image/jpeg",
    "size": 12345,
    "height": 800,
    "width": 600,
    "thumbnailUrl": "https://ik.imagekit.io/your_endpoint/tr:w-300/profile/image.jpg"
  }
}
```

### Get File Info

- **GET** `/v1/upload/:fileId`
- **Authentication**: Required (`getFiles` permission)

**Example Request:**

```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/v1/upload/file_id_here
```

### Delete File

- **DELETE** `/v1/upload/:fileId`
- **Authentication**: Required (`deleteFiles` permission)

**Example Request:**

```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/v1/upload/file_id_here
```

## File Validation

- **Supported Formats**: 
  - Images: JPEG, JPG, PNG, GIF, WebP
  - Documents: PDF
- **Maximum Size**: 
  - Images: 5MB
  - PDFs: 10MB
- **File Field Name**: `file`

## Error Handling

The module includes comprehensive error handling for:

- Invalid file types
- File size exceeded
- Missing files
- ImageKit API errors
- Authentication failures

## Usage in Frontend

### HTML Form

```html
<form action="/v1/upload" method="post" enctype="multipart/form-data">
  <input type="file" name="file" accept="image/*,.pdf" required />
  <input type="text" name="folder" placeholder="Folder name" />
  <input type="text" name="tags" placeholder="Tags (comma-separated)" />
  <input type="hidden" name="useUniqueFileName" value="true" />
  <button type="submit">Upload File</button>
</form>
```

### JavaScript/Fetch API

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('folder', 'profile');
formData.append('tags', 'avatar,profile');

fetch('/v1/upload', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
})
  .then((response) => response.json())
  .then((data) => console.log(data));
```

## Security

- File type validation
- File size limits
- Authentication required for all endpoints
- Role-based access control
- Input sanitization

## Dependencies

- `imagekit`: ImageKit.io SDK
- `multer`: File upload middleware
- `@types/multer`: TypeScript types for multer
