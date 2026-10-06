from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    name = Column(String)
    role = Column(String, default="jugador")

# NUEVA TABLA: Clubes
class Club(Base):
    __tablename__ = "clubs"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    location = Column(String)
    escudo = Column(String, nullable=True)
    color = Column(String)

# NUEVA TABLA: Equipos (Ej: Sporting - Infantil A)
class Team(Base):
    __tablename__ = "teams"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String) # Ej: "Infantil A"
    category = Column(String) # Ej: "Infantil", "Femenino", "Absoluto"
    club_id = Column(Integer, index=True) # A qué club pertenece
    
    # Relaciones
    players = relationship("Player", back_populates="team", cascade="all, delete")
    matches = relationship("Match", back_populates="team", cascade="all, delete")

class Player(Base):
    __tablename__ = "players"
    id = Column(Integer, primary_key=True, index=True)
    dorsal = Column(String, index=True)
    name = Column(String)
    position = Column(String)
    photo_url = Column(String, nullable=True)
    
    # 💡 CAMBIO: Ahora pertenecen a un Equipo, no a un Club directamente
    team_id = Column(Integer, ForeignKey("teams.id"))
    team = relationship("Team", back_populates="players")

class Match(Base):
    __tablename__ = "matches"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    date = Column(String)
    field = Column(String)
    filename = Column(String)
    resumen = Column(JSON)
    
    # 💡 CAMBIO: El partido pertenece a un Equipo específico
    team_id = Column(Integer, ForeignKey("teams.id"))
    team = relationship("Team", back_populates="matches")