from fastapi import FastAPI
from app.routes.archivos import archivos_bp
from app.routes.user_routes import user_bp
from app.auth.auth import auth_bp
import uvicorn
from sqlalchemy.orm import Session
from app.db import get_db, engine
from app.models.user import Base as UserBase
from app.models.archivo import Base as ArchivoBase

app = FastAPI()

# Create tables if they do not exist
UserBase.metadata.create_all(bind=engine)
ArchivoBase.metadata.create_all(bind=engine)

@app.get("/")
def read_root():
    return {"message": "Hello, World!"}

app.include_router(archivos_bp)
app.include_router(user_bp)
app.include_router(auth_bp)

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
