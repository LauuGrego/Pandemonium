from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.models.user import Usuario, UsuarioModel
from app.db import get_db
from app.auth.auth import get_current_user
from passlib.context import CryptContext

user_bp = APIRouter(prefix="/users")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@user_bp.get('/get', response_model=list[UsuarioModel], tags=["users"], name="get_all_users")
def get_users(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return db.query(Usuario).all()

@user_bp.get('/get/{id}', response_model=UsuarioModel, tags=["users"], name="get_single_user")
def get_user(id: int, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return db.query(Usuario).get(id)

@user_bp.post('/create', response_model=UsuarioModel, tags=["users"], name="create_new_user")
def create_user(user: UsuarioModel, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    hashed_password = pwd_context.hash(user.contrasena)
    new_user = Usuario(nombre=user.nombre, contrasena=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return UsuarioModel(nombre=new_user.nombre, contrasena=new_user.contrasena)

@user_bp.put('/update/{id}', response_model=UsuarioModel, tags=["users"], name="update_existing_user")
def update_user(id: int, user: UsuarioModel, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    db_user = db.query(Usuario).get(id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    db_user.nombre = user.nombre
    db_user.contrasena = pwd_context.hash(user.contrasena)
    db.commit()
    db.refresh(db_user)
    return UsuarioModel(nombre=db_user.nombre, contrasena=db_user.contrasena)

@user_bp.delete('/delete/{id}', status_code=204, tags=["users"], name="delete_user")
def delete_user(id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user = db.query(Usuario).get(id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return
