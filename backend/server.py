from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import bcrypt
import jwt
import shutil
import mimetypes

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection - support both MONGO_URL and MONGODB_URI
mongo_url = os.environ.get('MONGO_URL') or os.environ.get('MONGODB_URI')
if not mongo_url:
    raise Exception("MongoDB connection URL not found. Please set MONGO_URL or MONGODB_URI in .env")

client = AsyncIOMotorClient(mongo_url)
db = client['secureAuthDB']

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'secure-jwt-secret-key-production-change-this')

# Create uploads directory
UPLOAD_DIR = ROOT_DIR / 'uploads'
UPLOAD_DIR.mkdir(exist_ok=True)

# Blocked file extensions
BLOCKED_EXTENSIONS = ['.exe', '.bat', '.sh', '.cmd', '.com', '.app', '.msi', '.dmg']
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Pydantic Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class PhoneLogin(BaseModel):
    idToken: str
    phoneNumber: str

class AuthResponse(BaseModel):
    token: str
    user: dict

class RegisterResponse(BaseModel):
    message: str
    success: bool

class FileResponse(BaseModel):
    id: str = Field(alias='_id')
    userId: str
    fileName: str
    originalName: str
    fileType: str
    fileSize: int
    fileUrl: str
    uploadedAt: datetime

    class Config:
        populate_by_name = True

class UserUpdate(BaseModel):
    displayName: Optional[str] = None

class NoteCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)

class NoteUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1)

class TextCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)

# Authentication helper
async def verify_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="No token provided")
    
    token = authorization[7:]
    
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return decoded
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Routes
@api_router.get("/")
async def root():
    return {"message": "Secure Auth API Server"}

# Auth Routes
@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    try:
        # Check if user already exists
        existing_user = await db.users.find_one({"email": user_data.email.lower()})
        if existing_user:
            raise HTTPException(status_code=400, detail="User already registered. Please login.")
        
        # Hash password
        salt = bcrypt.gensalt()
        password_hash = bcrypt.hashpw(user_data.password.encode(), salt).decode()
        
        # Create user
        user_id = str(uuid.uuid4())
        user_doc = {
            "_id": user_id,
            "email": user_data.email.lower(),
            "passwordHash": password_hash,
            "authProvider": "email",
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "lastLogin": datetime.now(timezone.utc).isoformat()
        }
        
        await db.users.insert_one(user_doc)
        
        return {"message": "Registration successful", "success": True}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    try:
        # Find user
        user = await db.users.find_one({"email": user_data.email.lower()})
        if not user:
            raise HTTPException(status_code=404, detail="User not registered. Please register first.")
        
        # Verify password
        if not bcrypt.checkpw(user_data.password.encode(), user['passwordHash'].encode()):
            raise HTTPException(status_code=401, detail="Incorrect password.")
        
        # Update last login
        await db.users.update_one(
            {"_id": user['_id']},
            {"$set": {"lastLogin": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Generate JWT
        token = jwt.encode(
            {
                "userId": user['_id'],
                "email": user['email'],
                "authProvider": "email",
                "exp": datetime.now(timezone.utc).timestamp() + (7 * 24 * 60 * 60)  # 7 days
            },
            JWT_SECRET,
            algorithm='HS256'
        )
        
        return {
            "token": token,
            "user": {
                "id": user['_id'],
                "email": user['email'],
                "authProvider": user.get('authProvider', 'email')
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")

@api_router.post("/auth/phone-login")
async def phone_login(data: PhoneLogin):
    try:
        if not data.idToken or not data.phoneNumber:
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # Find or create user
        user = await db.users.find_one({"phoneNumber": data.phoneNumber})
        
        if not user:
            # Create new user
            user_id = str(uuid.uuid4())
            user_doc = {
                "_id": user_id,
                "phoneNumber": data.phoneNumber,
                "authProvider": "phone",
                "createdAt": datetime.now(timezone.utc).isoformat(),
                "lastLogin": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(user_doc)
            user = user_doc
        else:
            # Update last login
            await db.users.update_one(
                {"_id": user['_id']},
                {"$set": {"lastLogin": datetime.now(timezone.utc).isoformat()}}
            )
        
        # Generate JWT
        token = jwt.encode(
            {
                "userId": user['_id'],
                "phoneNumber": user.get('phoneNumber'),
                "authProvider": "phone",
                "exp": datetime.now(timezone.utc).timestamp() + (7 * 24 * 60 * 60)  # 7 days
            },
            JWT_SECRET,
            algorithm='HS256'
        )
        
        return {
            "token": token,
            "user": {
                "id": user['_id'],
                "phoneNumber": user.get('phoneNumber'),
                "authProvider": user.get('authProvider', 'phone')
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Phone login error: {e}")
        raise HTTPException(status_code=500, detail="Phone authentication failed")

# File Routes
@api_router.post("/files/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(verify_token)):
    try:
        if not file:
            raise HTTPException(status_code=400, detail="No file uploaded")
        
        # Check file extension
        ext = Path(file.filename).suffix.lower()
        if ext in BLOCKED_EXTENSIONS:
            raise HTTPException(status_code=400, detail="Executable files are not allowed for security reasons")
        
        # Generate unique filename
        unique_suffix = f"{int(datetime.now().timestamp() * 1000)}-{uuid.uuid4().hex[:8]}"
        new_filename = f"file-{unique_suffix}{ext}"
        file_path = UPLOAD_DIR / new_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            if len(content) > MAX_FILE_SIZE:
                raise HTTPException(status_code=400, detail="File size exceeds 50MB limit")
            buffer.write(content)
        
        # Get file type
        file_type = file.content_type or mimetypes.guess_type(file.filename)[0] or 'application/octet-stream'
        
        # Save file metadata
        file_id = str(uuid.uuid4())
        file_url = f"/uploads/{new_filename}"
        file_doc = {
            "_id": file_id,
            "userId": user['userId'],
            "fileName": new_filename,
            "originalName": file.filename,
            "fileType": file_type,
            "fileSize": len(content),
            "fileUrl": file_url,
            "uploadedAt": datetime.now(timezone.utc).isoformat()
        }
        
        await db.files.insert_one(file_doc)
        
        return {
            "message": "File uploaded successfully",
            "file": {
                "id": file_id,
                "fileName": file.filename,
                "fileType": file_type,
                "fileSize": len(content),
                "fileUrl": file_url,
                "uploadedAt": file_doc['uploadedAt']
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"File upload error: {e}")
        raise HTTPException(status_code=500, detail="File upload failed")

@api_router.get("/files")
async def get_files(user: dict = Depends(verify_token)):
    try:
        files_cursor = db.files.find({"userId": user['userId']}).sort("uploadedAt", -1)
        files = await files_cursor.to_list(1000)
        
        # Format files for response
        formatted_files = []
        for f in files:
            formatted_files.append({
                "_id": f['_id'],
                "userId": f['userId'],
                "fileName": f['fileName'],
                "originalName": f['originalName'],
                "fileType": f['fileType'],
                "fileSize": f['fileSize'],
                "fileUrl": f['fileUrl'],
                "uploadedAt": f['uploadedAt']
            })
        
        return {"files": formatted_files}
    except Exception as e:
        logging.error(f"Fetch files error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch files")

@api_router.delete("/files/{file_id}")
async def delete_file(file_id: str, user: dict = Depends(verify_token)):
    try:
        # Find file
        file_doc = await db.files.find_one({"_id": file_id, "userId": user['userId']})
        if not file_doc:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Delete physical file
        file_path = UPLOAD_DIR / file_doc['fileName']
        if file_path.exists():
            file_path.unlink()
        
        # Delete from database
        await db.files.delete_one({"_id": file_id})
        
        return {"message": "File deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Delete file error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete file")

# User Profile Routes
@api_router.get("/user/profile")
async def get_profile(user: dict = Depends(verify_token)):
    try:
        user_doc = await db.users.find_one({"_id": user['userId']})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "user": {
                "id": user_doc['_id'],
                "email": user_doc.get('email'),
                "phoneNumber": user_doc.get('phoneNumber'),
                "displayName": user_doc.get('displayName'),
                "authProvider": user_doc.get('authProvider', 'email')
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Get profile error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch profile")

@api_router.put("/user/profile")
async def update_profile(user_update: UserUpdate, user: dict = Depends(verify_token)):
    try:
        update_data = {}
        if user_update.displayName is not None:
            update_data['displayName'] = user_update.displayName
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")
        
        await db.users.update_one(
            {"_id": user['userId']},
            {"$set": update_data}
        )
        
        return {"message": "Profile updated successfully", "success": True}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Update profile error: {e}")
        raise HTTPException(status_code=500, detail="Profile update failed")

# Notes Routes
@api_router.post("/notes")
async def create_note(note_data: NoteCreate, user: dict = Depends(verify_token)):
    try:
        note_id = str(uuid.uuid4())
        note_doc = {
            "_id": note_id,
            "userId": user['userId'],
            "title": note_data.title,
            "content": note_data.content,
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }
        
        await db.notes.insert_one(note_doc)
        
        return {
            "message": "Note created successfully",
            "note": {
                "id": note_id,
                "title": note_data.title,
                "content": note_data.content,
                "createdAt": note_doc['createdAt'],
                "updatedAt": note_doc['updatedAt']
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Create note error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create note")

@api_router.get("/notes")
async def get_notes(user: dict = Depends(verify_token)):
    try:
        notes_cursor = db.notes.find({"userId": user['userId']}).sort("updatedAt", -1)
        notes = await notes_cursor.to_list(1000)
        
        formatted_notes = []
        for n in notes:
            formatted_notes.append({
                "_id": n['_id'],
                "userId": n['userId'],
                "title": n['title'],
                "content": n['content'],
                "createdAt": n['createdAt'],
                "updatedAt": n['updatedAt']
            })
        
        return {"notes": formatted_notes}
    except Exception as e:
        logging.error(f"Fetch notes error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch notes")

@api_router.get("/notes/{note_id}")
async def get_note(note_id: str, user: dict = Depends(verify_token)):
    try:
        note = await db.notes.find_one({"_id": note_id, "userId": user['userId']})
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        return {
            "note": {
                "_id": note['_id'],
                "userId": note['userId'],
                "title": note['title'],
                "content": note['content'],
                "createdAt": note['createdAt'],
                "updatedAt": note['updatedAt']
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Fetch note error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch note")

@api_router.put("/notes/{note_id}")
async def update_note(note_id: str, note_data: NoteUpdate, user: dict = Depends(verify_token)):
    try:
        note = await db.notes.find_one({"_id": note_id, "userId": user['userId']})
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        update_data = {"updatedAt": datetime.now(timezone.utc).isoformat()}
        if note_data.title is not None:
            update_data['title'] = note_data.title
        if note_data.content is not None:
            update_data['content'] = note_data.content
        
        await db.notes.update_one(
            {"_id": note_id},
            {"$set": update_data}
        )
        
        return {"message": "Note updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Update note error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update note")

@api_router.delete("/notes/{note_id}")
async def delete_note(note_id: str, user: dict = Depends(verify_token)):
    try:
        note = await db.notes.find_one({"_id": note_id, "userId": user['userId']})
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        await db.notes.delete_one({"_id": note_id})
        
        return {"message": "Note deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Delete note error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete note")

# Text Storage Routes
@api_router.post("/texts")
async def create_text(text_data: TextCreate, user: dict = Depends(verify_token)):
    try:
        text_id = str(uuid.uuid4())
        text_doc = {
            "_id": text_id,
            "userId": user['userId'],
            "title": text_data.title,
            "content": text_data.content,
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }
        
        await db.texts.insert_one(text_doc)
        
        return {
            "message": "Text saved successfully",
            "text": {
                "id": text_id,
                "title": text_data.title,
                "content": text_data.content,
                "createdAt": text_doc['createdAt'],
                "updatedAt": text_doc['updatedAt']
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Create text error: {e}")
        raise HTTPException(status_code=500, detail="Failed to save text")

@api_router.get("/texts")
async def get_texts(user: dict = Depends(verify_token)):
    try:
        texts_cursor = db.texts.find({"userId": user['userId']}).sort("updatedAt", -1)
        texts = await texts_cursor.to_list(1000)
        
        formatted_texts = []
        for t in texts:
            formatted_texts.append({
                "_id": t['_id'],
                "userId": t['userId'],
                "title": t['title'],
                "content": t['content'],
                "createdAt": t['createdAt'],
                "updatedAt": t['updatedAt']
            })
        
        return {"texts": formatted_texts}
    except Exception as e:
        logging.error(f"Fetch texts error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch texts")

@api_router.delete("/texts/{text_id}")
async def delete_text(text_id: str, user: dict = Depends(verify_token)):
    try:
        text = await db.texts.find_one({"_id": text_id, "userId": user['userId']})
        if not text:
            raise HTTPException(status_code=404, detail="Text not found")
        
        await db.texts.delete_one({"_id": text_id})
        
        return {"message": "Text deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Delete text error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete text")

# Storage Stats Route
@api_router.get("/storage/stats")
async def get_storage_stats(user: dict = Depends(verify_token)):
    try:
        # Get all files for user
        files_cursor = db.files.find({"userId": user['userId']})
        files = await files_cursor.to_list(10000)
        
        # Calculate total storage used
        total_used = sum(f.get('fileSize', 0) for f in files)
        
        # Storage limit (10GB in bytes, configurable)
        storage_limit = 10 * 1024 * 1024 * 1024  # 10GB
        
        # Calculate storage by type
        storage_by_type = {}
        for f in files:
            file_type = f.get('fileType', 'unknown')
            # Simplify file type categorization
            if 'image' in file_type:
                category = 'Images'
            elif 'video' in file_type:
                category = 'Videos'
            elif 'audio' in file_type:
                category = 'Audio'
            elif 'pdf' in file_type:
                category = 'PDFs'
            elif 'text' in file_type or 'document' in file_type:
                category = 'Documents'
            else:
                category = 'Other'
            
            storage_by_type[category] = storage_by_type.get(category, 0) + f.get('fileSize', 0)
        
        # Count notes and texts
        notes_count = await db.notes.count_documents({"userId": user['userId']})
        texts_count = await db.texts.count_documents({"userId": user['userId']})
        
        # Estimate storage for notes and texts (rough estimate)
        notes_storage = notes_count * 5000  # ~5KB per note
        texts_storage = texts_count * 2000  # ~2KB per text
        
        total_used_with_data = total_used + notes_storage + texts_storage
        
        return {
            "storageUsed": total_used_with_data,
            "storageLimit": storage_limit,
            "storageRemaining": max(0, storage_limit - total_used_with_data),
            "percentageUsed": round((total_used_with_data / storage_limit) * 100, 2) if storage_limit > 0 else 0,
            "fileCount": len(files),
            "notesCount": notes_count,
            "textsCount": texts_count,
            "storageByType": storage_by_type
        }
    except Exception as e:
        logging.error(f"Get storage stats error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch storage stats")

# Analytics Route
@api_router.get("/analytics")
async def get_analytics(user: dict = Depends(verify_token)):
    try:
        # Get all files for user
        files_cursor = db.files.find({"userId": user['userId']}).sort("uploadedAt", 1)
        files = await files_cursor.to_list(10000)
        
        # Calculate file type distribution
        file_type_distribution = {}
        for f in files:
            file_type = f.get('fileType', 'unknown')
            # Categorize
            if 'image' in file_type:
                category = 'Images'
            elif 'video' in file_type:
                category = 'Videos'
            elif 'audio' in file_type:
                category = 'Audio'
            elif 'pdf' in file_type:
                category = 'PDFs'
            elif 'text' in file_type or 'document' in file_type:
                category = 'Documents'
            else:
                category = 'Other'
            
            file_type_distribution[category] = file_type_distribution.get(category, 0) + 1
        
        # Calculate upload trends (last 30 days)
        upload_trends = []
        from datetime import timedelta
        today = datetime.now(timezone.utc)
        
        for i in range(30, -1, -1):
            day = today - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            day_files = [f for f in files if day_start.isoformat() <= f.get('uploadedAt', '') < day_end.isoformat()]
            day_size = sum(f.get('fileSize', 0) for f in day_files)
            
            upload_trends.append({
                "date": day_start.strftime("%Y-%m-%d"),
                "count": len(day_files),
                "size": day_size
            })
        
        # Total stats
        total_storage = sum(f.get('fileSize', 0) for f in files)
        notes_count = await db.notes.count_documents({"userId": user['userId']})
        texts_count = await db.texts.count_documents({"userId": user['userId']})
        
        return {
            "totalFiles": len(files),
            "totalStorage": total_storage,
            "notesCount": notes_count,
            "textsCount": texts_count,
            "fileTypeDistribution": file_type_distribution,
            "uploadTrends": upload_trends
        }
    except Exception as e:
        logging.error(f"Get analytics error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch analytics")

# File Download Route
@api_router.get("/files/download/{file_id}")
async def download_file(file_id: str, user: dict = Depends(verify_token)):
    try:
        # Find file
        file_doc = await db.files.find_one({"_id": file_id, "userId": user['userId']})
        if not file_doc:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Check if physical file exists
        file_path = UPLOAD_DIR / file_doc['fileName']
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found on server")
        
        # Return file for download
        return FileResponse(
            path=file_path,
            filename=file_doc['originalName'],
            media_type=file_doc.get('fileType', 'application/octet-stream')
        )
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Download file error: {e}")
        raise HTTPException(status_code=500, detail="Failed to download file")

# Settings Routes
class UserSettings(BaseModel):
    theme: Optional[str] = None
    displayName: Optional[str] = None
    layoutPreference: Optional[str] = None

@api_router.get("/settings")
async def get_settings(user: dict = Depends(verify_token)):
    try:
        user_doc = await db.users.find_one({"_id": user['userId']})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        settings = user_doc.get('settings', {})
        return {
            "settings": {
                "theme": settings.get('theme', 'light'),
                "displayName": user_doc.get('displayName', ''),
                "layoutPreference": settings.get('layoutPreference', 'grid')
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Get settings error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch settings")

@api_router.put("/settings")
async def update_settings(settings_data: UserSettings, user: dict = Depends(verify_token)):
    try:
        update_data = {}
        settings_update = {}
        
        if settings_data.theme is not None:
            settings_update['theme'] = settings_data.theme
        if settings_data.layoutPreference is not None:
            settings_update['layoutPreference'] = settings_data.layoutPreference
        if settings_data.displayName is not None:
            update_data['displayName'] = settings_data.displayName
        
        if settings_update:
            update_data['settings'] = settings_update
        
        if update_data:
            # Use dot notation for nested update
            flat_update = {}
            for key, value in update_data.items():
                if key == 'settings':
                    for setting_key, setting_value in value.items():
                        flat_update[f'settings.{setting_key}'] = setting_value
                else:
                    flat_update[key] = value
            
            await db.users.update_one(
                {"_id": user['userId']},
                {"$set": flat_update}
            )
        
        return {"message": "Settings updated successfully", "success": True}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Update settings error: {e}")
        raise HTTPException(status_code=500, detail="Settings update failed")

# Include the router in the main app
app.include_router(api_router)

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
