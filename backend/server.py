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
