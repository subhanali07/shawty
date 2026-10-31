import hashlib
import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, HttpUrl, field_validator
from sqlalchemy import String, create_engine, func, inspect, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./links.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
BASE_URL = os.getenv("BASE_URL")
FRONTEND_DIST = Path(__file__).resolve().parent / "frontend" / "dist"
FRONTEND_ORIGINS = os.getenv(
    "FRONTEND_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
).split(",")

ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
CODE_OFFSET = 1_000_000
ALIAS_PATTERN = re.compile(r"^[A-Za-z0-9_-]{3,32}$")
OWNER_PATTERN = re.compile(r"^[A-Za-z0-9_-]{16,128}$")
OWNER_HEADER = "X-Shawty-Owner"

RESERVED_CODES = {"api", "docs", "redoc", "health", "openapi.json", "favicon.ico", "ui"}


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


IS_SQLITE = DATABASE_URL.startswith("sqlite")
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if IS_SQLITE else {},
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    pass


class Link(Base):
    __tablename__ = "links"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str | None] = mapped_column(String(32), unique=True, index=True)
    original_url: Mapped[str] = mapped_column(String(2048), index=True)
    is_custom: Mapped[bool] = mapped_column(default=False)
    owner_hash: Mapped[str | None] = mapped_column(String(64), index=True)
    clicks: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    expires_at: Mapped[datetime | None] = mapped_column(default=None)
    last_clicked_at: Mapped[datetime | None] = mapped_column(default=None)


def ensure_owner_column():
    inspector = inspect(engine)
    if "links" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("links")}
    if "owner_hash" not in columns:
        try:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE links ADD COLUMN owner_hash VARCHAR(64)"))
        except Exception:
            columns = {column["name"] for column in inspect(engine).get_columns("links")}
            if "owner_hash" not in columns:
                raise

    with engine.begin() as connection:
        connection.execute(
            text("CREATE INDEX IF NOT EXISTS ix_links_owner_hash ON links (owner_hash)")
        )


Base.metadata.create_all(bind=engine)
ensure_owner_column()


class ShortenRequest(BaseModel):
    url: HttpUrl
    alias: str | None = Field(default=None, description="Optional custom short code")
    expires_in_days: int | None = Field(default=None, ge=1, le=365)

    @field_validator("alias")
    @classmethod
    def check_alias(cls, value: str | None):
        if value is None:
            return None
        value = value.strip()
        if not value:
            return None
        if not ALIAS_PATTERN.match(value):
            raise ValueError("Alias must be 3-32 characters: letters, numbers, - or _")
        if value.lower() in RESERVED_CODES:
            raise ValueError("That alias is reserved")
        return value


class LinkOut(BaseModel):
    code: str
    short_url: str
    original_url: str
    is_custom: bool
    clicks: int
    created_at: datetime
    expires_at: datetime | None
    last_clicked_at: datetime | None
    is_expired: bool


class StatsOut(BaseModel):
    total_links: int
    total_clicks: int
    top_link: LinkOut | None


def encode_base62(num: int) -> str:
    if num == 0:
        return ALPHABET[0]
    chars = []
    while num > 0:
        num, rem = divmod(num, 62)
        chars.append(ALPHABET[rem])
    return "".join(reversed(chars))


def make_code(link_id: int, db: Session) -> str:
    n = link_id + CODE_OFFSET
    code = encode_base62(n)

    while db.scalar(select(Link.id).where(Link.code == code)):
        n += 1
        code = encode_base62(n)
    return code


def request_base_url(request: Request) -> str:
    if BASE_URL:
        return BASE_URL.rstrip("/")
    proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or request.url.netloc
    return f"{proto}://{host}".rstrip("/")


def to_out(link: Link, base_url: str) -> LinkOut:
    expired = link.expires_at is not None and link.expires_at < utcnow()
    code = link.code or ""
    return LinkOut(
        code=code,
        short_url=f"{base_url}/{code}",
        original_url=link.original_url,
        is_custom=link.is_custom,
        clicks=link.clicks,
        created_at=link.created_at,
        expires_at=link.expires_at,
        last_clicked_at=link.last_clicked_at,
        is_expired=expired,
    )


def get_link_or_404(code: str, db: Session) -> Link:
    link = db.scalar(select(Link).where(Link.code == code))
    if link is None:
        raise HTTPException(status_code=404, detail="Short link not found")
    return link


def get_owned_link_or_404(code: str, owner_hash: str, db: Session) -> Link:
    link = db.scalar(
        select(Link).where(Link.code == code, Link.owner_hash == owner_hash)
    )
    if link is None:
        raise HTTPException(status_code=404, detail="Short link not found")
    return link


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_owner_hash(
    x_shawty_owner: str | None = Header(default=None, alias=OWNER_HEADER),
) -> str:
    token = (x_shawty_owner or "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="Missing browser identity")
    if not OWNER_PATTERN.match(token):
        raise HTTPException(status_code=400, detail="Invalid browser identity")
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


app = FastAPI(
    title="Shawty",
    description=(
        "Links are scoped to the anonymous browser token sent in the "
        f"`{OWNER_HEADER}` header. Send the same token to manage the same links."
    ),
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/links", response_model=list[LinkOut])
def list_links(
    request: Request,
    owner_hash: str = Depends(get_owner_hash),
    db: Session = Depends(get_db),
):
    base_url = request_base_url(request)
    links = db.scalars(
        select(Link)
        .where(Link.owner_hash == owner_hash)
        .order_by(Link.created_at.desc())
    ).all()
    return [to_out(link, base_url) for link in links]


@app.post("/api/links", response_model=LinkOut, status_code=201)
def create_link(
    payload: ShortenRequest,
    request: Request,
    response: Response,
    owner_hash: str = Depends(get_owner_hash),
    db: Session = Depends(get_db),
):
    base_url = request_base_url(request)
    target = str(payload.url)
    alias = payload.alias

    if alias:
        taken = db.scalar(select(Link.id).where(Link.code == alias))
        if taken:
            raise HTTPException(status_code=409, detail="That alias is already taken")

    expires_at = None
    if payload.expires_in_days is not None:
        expires_at = utcnow() + timedelta(days=payload.expires_in_days)

    link = Link(
        original_url=target,
        is_custom=alias is not None,
        owner_hash=owner_hash,
        expires_at=expires_at,
    )
    db.add(link)

    try:
        db.flush()
        link.code = alias or make_code(link.id, db)
        db.commit()
    except IntegrityError:
        db.rollback()
        if alias:
            raise HTTPException(
                status_code=409, detail="That alias is already taken"
            ) from None
        raise HTTPException(
            status_code=409, detail="Could not allocate a code, please try again"
        ) from None

    db.refresh(link)

    output = to_out(link, base_url)
    response.headers["Location"] = output.short_url
    return output


@app.get("/api/stats", response_model=StatsOut)
def overall_stats(
    request: Request,
    owner_hash: str = Depends(get_owner_hash),
    db: Session = Depends(get_db),
):
    base_url = request_base_url(request)
    total_links = (
        db.scalar(
            select(func.count(Link.id)).where(Link.owner_hash == owner_hash)
        )
        or 0
    )
    total_clicks = (
        db.scalar(
            select(func.coalesce(func.sum(Link.clicks), 0)).where(
                Link.owner_hash == owner_hash
            )
        )
        or 0
    )
    top = db.scalar(
        select(Link)
        .where(Link.owner_hash == owner_hash)
        .order_by(Link.clicks.desc())
        .limit(1)
    )

    return StatsOut(
        total_links=total_links,
        total_clicks=total_clicks,
        top_link=to_out(top, base_url) if top and top.clicks > 0 else None,
    )


@app.get("/api/links/{code}", response_model=LinkOut)
def link_details(
    code: str,
    request: Request,
    owner_hash: str = Depends(get_owner_hash),
    db: Session = Depends(get_db),
):
    link = get_owned_link_or_404(code, owner_hash, db)
    return to_out(link, request_base_url(request))


@app.delete("/api/links/{code}", status_code=204)
def delete_link(
    code: str,
    owner_hash: str = Depends(get_owner_hash),
    db: Session = Depends(get_db),
):
    link = get_owned_link_or_404(code, owner_hash, db)
    db.delete(link)
    db.commit()
    return Response(status_code=204)


if FRONTEND_DIST.is_dir():
    app.mount("/ui", StaticFiles(directory=FRONTEND_DIST, html=True), name="ui")


@app.get("/")
def index():
    return RedirectResponse("/ui/")


@app.get("/{code}")
def follow_link(code: str, db: Session = Depends(get_db)):
    link = get_link_or_404(code, db)

    now = utcnow()
    if link.expires_at and link.expires_at < now:
        raise HTTPException(status_code=410, detail="This link has expired")

    link.clicks += 1
    link.last_clicked_at = now
    db.commit()
    return RedirectResponse(link.original_url, status_code=302)
