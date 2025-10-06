# Product Management API

## Project Overview

A RESTful API system for product management with features including:
- Full CRUD operations for products
- Advanced search engine with filters and full-text search
- File attachment management with tree-structure organization
- Secure file upload/download with UUID-based naming
- File tree visualization and statistics

## Tech Stack

- **Framework**: NestJS
- **ORM**: TypeORM
- **Database**: PostgreSQL
- **Runtime**: Node.js
- **Package Manager**: Yarn
- **Containerization**: Docker & Docker Compose

## Installation & Setup

### 1. Clone Repository

```bash
git clone https://github.com/mtnkhang27/Oven-apply.git
cd Oven-apply
```

### 2. Environment Configuration

Create `.env` file from template:

```bash
cp .env.example .env
```

Edit `.env` file with your configuration:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=product_management

# Application
PORT=9000
NODE_ENV=development
```

### 3. Start Database with Docker

```bash
# Start PostgreSQL container
docker-compose up -d --build

# Verify database is running
docker-compose ps
```

### 4. Install Dependencies

```bash
yarn install
```

### 5. Start Application
Before running application, please run 
```bash
yarn seed
```
This project is configured for multilingual support, so the database must contain at least one language entry before the app can start.

**Development mode:**
```bash
yarn dev
```
The API will be available at: `http://localhost:9000`

## API Documentation

### Swagger UI

Once the application is running, access the interactive API documentation:

```
http://localhost:9000/api
```

### Main Endpoints

#### Products

- `GET /products` - List all products with pagination and search advanced
- `GET /products/:id` - Get product details
- `POST /products` - Create new product
- `PATCH /products/:id` - Update product
- `DELETE /products/:id` - Delete product

#### Product Attachments

- `POST /products/:productId/attachments/upload` - Upload file
- `GET /products/:productId/attachments/tree` - Get file tree structure
- `GET /products/:productId/attachments/list` - List all files
- `GET /products/:productId/attachments/stats` - Get statistics
- `GET /products/:productId/attachments/download` - Download file by path
- `DELETE /products/:productId/attachments` - Delete file
- `DELETE /products/:productId/attachments/folder` - Delete folder

## Features

### 1. Product Management

**Search capabilities:**
- Apply search engine by name. For example:
  - Product 1: PD Xiaomi 35W. Product 2: PD Samsung 35W. 
  - User input: PD 35W -> The result would return both of result.
- Filter by price range, status
- Pagination support


### 2. File Attachment System

**Security features:**
- UUID-based file naming (prevents path traversal)
- Extension whitelist validation
- Path depth limitation

**Supported file types:**
- Images: jpg, jpeg, png, gif
- Documents: pdf, doc, docx, txt
- Archives: zip
- Spreadsheets: xlsx, csv

**File organization:**
```
uploads/
└── {productId}/
    ├── images/
    │   └── {uuid}.jpg
    ├── documents/
    │   └── {uuid}.pdf
    └── videos/
        └── {uuid}.mp4
```

**Upload example:**
```bash
curl -X POST \
  http://localhost:9000/products/1/attachments/upload?folder=images \
  -F "file=@photo.jpg"
```

**Response:**
```json
{
  "statusCode": 201,
  "message": "File uploaded successfully",
  "data": {
    "id": 123,
    "originalName": "photo.jpg",
    "storedName": "a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
    "path": "images/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
    "size": 102400,
    "extension": "jpg",
    "mimeType": "image/jpeg",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Download file:**
```bash
curl -X GET \
  "http://localhost:9000/products/1/attachments/download?path=images/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg" \
  -O photo.jpg
```

### 3. File Tree Structure

Get hierarchical folder/file structure:

```bash
GET /products/1/attachments/tree
```

**Response:**
```json
{
  "name": "root",
  "type": "folder",
  "path": "/",
  "children": [
    {
      "name": "images",
      "type": "folder",
      "path": "images",
      "children": [
        {
          "name": "a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
          "type": "file",
          "path": "images/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
          "originalName": "photo.jpg",
          "size": 102400,
          "extension": "jpg",
          "mimeType": "image/jpeg",
          "createdAt": "2024-01-01T00:00:00.000Z"
        }
      ]
    }
  ]
}
```

## Project Structure

```
src/
├── modules/
│   ├── products/
│   │   ├── entities/
│   │   ├── dto/
│   │   ├── products.controller.ts
│   │   ├── products.service.ts
│   │   └── products.module.ts
│   └── product-attachments/
│       ├── entities/
│       ├── product-attachments.controller.ts
│       ├── product-attachments.service.ts
│       └── product-attachments.module.ts
├── utils/
│   ├── file-tree.util.ts
│   └── hashmap.util.ts
├── config/
├── migrations/
└── main.ts
```

## Troubleshooting

### Port Already in Use

```bash
# Change PORT in .env file
PORT=9001

# Or kill process using port 9000 (Linux/Mac)
lsof -ti:9000 | xargs kill -9

# Windows
netstat -ano | findstr :9000
taskkill /PID <PID> /F
```

## Security Considerations

- Path traversal attacks are prevented via path sanitization
- Files are stored with UUID names to prevent guessing
- Environment variables should never be committed

## Performance Optimization

- In-memory file tree for fast lookups
- Database indexes on frequently queried fields
- Pagination on list endpoints
- Connection pooling for database

# 
**Built with NestJS** - A progressive Node.js framework
