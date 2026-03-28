"""Database models for settings storage."""
import os
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, Float, String, Text, DateTime, Boolean, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()


class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(255), unique=True, nullable=False)
    value = Column(Text)
    updated_at = Column(DateTime, default=datetime.now)


class AutoRunLog(Base):
    __tablename__ = "autorun_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    started_at = Column(DateTime, default=datetime.now)
    finished_at = Column(DateTime, nullable=True)
    status = Column(String(20), default="running")  # running, success, failed
    user = Column(String(255), nullable=True)  # which user this run was for, or "all"
    movies_added = Column(Integer, default=0)
    series_added = Column(Integer, default=0)
    movies_skipped = Column(Integer, default=0)
    series_skipped = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    details = Column(Text, nullable=True)  # JSON with added titles


class Database:
    def __init__(self, db_path: str = None):
        # If no path provided, use data/settings.db
        if db_path is None:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            data_dir = os.path.join(script_dir, "data")
            os.makedirs(data_dir, exist_ok=True)
            self.db_path = os.path.join(data_dir, "settings.db")
        else:
            self.db_path = db_path
        self.engine = create_engine(f"sqlite:///{self.db_path}", echo=False)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)

    def create_tables(self):
        """Create all tables if they don't exist."""
        Base.metadata.create_all(bind=self.engine)

    def get_session(self):
        """Get a database session."""
        return self.SessionLocal()

    def get_setting(self, key: str) -> Optional[str]:
        """Get a setting by key."""
        with self.get_session() as session:
            setting = session.query(Setting).filter(Setting.key == key).first()
            return setting.value if setting else None

    def set_setting(self, key: str, value: str):
        """Set a setting value."""
        with self.get_session() as session:
            existing = session.query(Setting).filter(Setting.key == key).first()
            if existing:
                existing.value = value
                existing.updated_at = datetime.now()
            else:
                setting = Setting(key=key, value=value)
                session.add(setting)
            session.commit()

    def delete_setting(self, key: str):
        """Delete a setting."""
        with self.get_session() as session:
            setting = session.query(Setting).filter(Setting.key == key).first()
            if setting:
                session.delete(setting)
                session.commit()

    def get_all_settings(self) -> dict:
        """Get all settings as a dictionary."""
        with self.get_session() as session:
            settings = session.query(Setting).all()
            return {s.key: s.value for s in settings}


    def add_run_log(self, user: str = "all") -> int:
        """Create a new run log entry, return its id."""
        with self.get_session() as session:
            log = AutoRunLog(user=user, status="running", started_at=datetime.now())
            session.add(log)
            session.commit()
            session.refresh(log)
            return log.id

    def update_run_log(self, log_id: int, **kwargs):
        """Update a run log entry."""
        with self.get_session() as session:
            log = session.query(AutoRunLog).filter(AutoRunLog.id == log_id).first()
            if log:
                for key, value in kwargs.items():
                    setattr(log, key, value)
                session.commit()

    def get_run_logs(self, limit: int = 20) -> list:
        """Get recent run logs."""
        with self.get_session() as session:
            logs = session.query(AutoRunLog).order_by(
                AutoRunLog.started_at.desc()
            ).limit(limit).all()
            return [{
                "id": l.id,
                "started_at": l.started_at.isoformat() if l.started_at else None,
                "finished_at": l.finished_at.isoformat() if l.finished_at else None,
                "status": l.status,
                "user": l.user,
                "movies_added": l.movies_added,
                "series_added": l.series_added,
                "movies_skipped": l.movies_skipped,
                "series_skipped": l.series_skipped,
                "error_message": l.error_message,
                "details": l.details,
            } for l in logs]

    def get_latest_run(self) -> dict | None:
        """Get the most recent run log."""
        logs = self.get_run_logs(limit=1)
        return logs[0] if logs else None


# Global database instance
db = Database()
