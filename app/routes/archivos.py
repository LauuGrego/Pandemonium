from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from app.db import get_db
from app.auth.auth import get_current_user
import os
from werkzeug.utils import secure_filename
from sqlalchemy.orm import Session
from app.models.archivo import Archivo

archivos_bp = APIRouter(prefix="/archivos")
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'mp3', 'wav', 'flac'}

# Crear el directorio de subida si no existe
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@archivos_bp.post('/upload')
def upload_file(file_type: str = Form(...), file: UploadFile = File(...), db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    file_type = file_type.lower()
    if file_type not in {"musica", "publicidad", "noticia"}:
        raise HTTPException(status_code=400, detail="Invalid file type")
    if not allowed_file(file.filename):
        raise HTTPException(status_code=400, detail="File type not allowed")
    secure_name = secure_filename(file.filename)
    file_location = os.path.join(UPLOAD_FOLDER, secure_name)
    with open(file_location, "wb+") as file_object:
        file_object.write(file.file.read())
    new_file = Archivo(nombre=secure_name, ruta=file_location, tipo=file_type)
    db.add(new_file)
    db.commit()
    db.refresh(new_file)
    return {"message": "File uploaded successfully"}

@archivos_bp.get('/download/{filename}')
def download_file(filename: str, user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if allowed_file(filename):
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.exists(file_path):
            return FileResponse(file_path, filename=filename)
        else:
            raise HTTPException(status_code=404, detail="File not found")
    else:
        raise HTTPException(status_code=400, detail="File type not allowed")

@archivos_bp.delete('/delete/{filename}')
def delete_file(filename: str, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if not allowed_file(filename):
        raise HTTPException(status_code=400, detail="File type not allowed")
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        db_file = db.query(Archivo).filter(Archivo.nombre == filename).first()
        if db_file:
            db.delete(db_file)
            db.commit()
            return {"message": "File deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="File not found in database")
    else:
        raise HTTPException(status_code=404, detail="File not found")

@archivos_bp.get('/list')
def list_files(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    files = db.query(Archivo).all()
    return {"files": [{"nombre": file.nombre, "tipo":file.tipo  ,"ruta": file.ruta} for file in files]}
