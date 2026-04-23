#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import subprocess
import sys
import os
import asyncio
import json
import random
import time
import logging
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime

# --- Ek Bağımlılık: Supabase ---
# pip install supabase
from supabase import create_client, Client as SupabaseClient

# --- ENJEKTE EDİLEN KURULUM BLOĞU ---
def initialize_vps():
    print("🚀 VPS ortamı kontrol ediliyor...")
    required_libs = [
        "fastapi", "uvicorn", "twikit", "playwright", "pydantic",
        "pyotp", "aiohttp", "playwright-stealth", "fake-useragent", "supabase", "aiogram"
    ]
    for lib in required_libs:
        try:
            __import__(lib.replace("-", "_"))
        except ImportError:
            print(f"Eksik paket kuruluyor: {lib}")
            subprocess.check_call([sys.executable, "-m", "pip", "install", lib])

    try:
        subprocess.run([sys.executable, "-m", "playwright", "install", "chromium"], check=True)
        subprocess.run([sys.executable, "-m", "playwright", "install-deps", "chromium"], check=True)
    except Exception as e:
        print(f"Playwright kurulumunda uyarı: {e}")

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("xkodcum")

initialize_vps()

from playwright.async_api import async_playwright
from playwright_stealth import Stealth
from fake_useragent import UserAgent

# Dinamik User-Agent Üretici
try:
    ua_factory = UserAgent()
except Exception as e:
    logger.warning(f"UserAgent factory could not be initialized: {e}")
    ua_factory = None

# --- Supabase Bağlantı Bilgileri ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    logger.warning("Supabase URL veya KEY bulunamadı. Supabase entegrasyonu devre dışı olabilir.")
else:
    supabase: SupabaseClient = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(title="X-KODCUM Backend", version="2.0.0")

# Dashboard için logları hafızada tutacak liste
activity_logs = []

# CORS ayarları
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# İçeriden log basmak için yardımcı fonksiyon
def internal_log(mesaj, hedef="SYSTEM", tip="info"):
    log_entry = {
        "target_url": hedef,
        "durum": mesaj,
        "status": tip,
        "created_at": datetime.now().isoformat()
    }
    activity_logs.insert(0, log_entry)  # En yeni log en üste
    if len(activity_logs) > 50:
        activity_logs.pop()  # Son 50 logu tut

# ==================== Session Manager ====================
class SessionManager:
    def __init__(self):
        self.sessions = {}
        self.cookies_dir = "cookies"
        os.makedirs(self.cookies_dir, exist_ok=True)

    async def login(self, username: str, password: str, email: str = None, two_fa_secret: str = None, proxy: str = None, user_agent: str = None):
        try:
            import twikit
            client = twikit.Client(language="tr")
            
            # User-Agent Ayarı
            if user_agent:
                client._user_agent = user_agent
            elif ua_factory:
                client._user_agent = ua_factory.random
            else:
                client._user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

            if proxy:
                client.set_proxy(proxy)

            cookie_file = os.path.join(self.cookies_dir, f"{username}.json")

            # 1. ADIM: Kayıtlı Çerez Kontrolü
            if os.path.exists(cookie_file):
                print(f"🔄 @{username} için çerez dosyası bulundu. Yükleniyor...")
                client.load_cookies(cookie_file)
                self.sessions[username] = client
                me = await client.user()
                print(f"✅ @{username} başarıyla çerezden yüklendi.")
                return {"success": True, "message": "Kayıtlı çerezlerle giriş yapıldı", "user": {"name": me.name, "username": me.screen_name}}

            # 2. ADIM: Dosya Yoksa İlk Giriş İşlemi
            print(f"🔑 @{username} için İLK GİRİŞ başlatılıyor...")
            await client.login(
                auth_info_1=username,
                auth_info_2=email,
                password=password,
                totp_secret=two_fa_secret
            )

            # 3. ADIM: Giriş Başarılı -> Gelecek sefer için kaydet
            client.save_cookies(cookie_file)
            self.sessions[username] = client
            me = await client.user()
            print(f"💾 @{username} oturumu başarıyla oluşturuldu.")

            return {
                "success": True,
                "message": "Yeni giriş başarılı ve çerezler oluşturuldu.",
                "user": {
                    "name": me.name,
                    "username": me.screen_name,
                    "followers_count": getattr(me, "followers_count", None)
                }
            }
        except Exception as e:
            print(f"❌ @{username} giriş hatası: {str(e)}")
            raise HTTPException(status_code=401, detail=f"Giriş Başarısız: {str(e)}")

    def get_client(self, username: str):
        client = self.sessions.get(username)
        if not client:
            import os
            from twikit import Client
            cookie_path = os.path.join(self.cookies_dir, f"{username}.json")

            if os.path.exists(cookie_path):
                client = Client('en-US')
                client.load_cookies(cookie_path)
                self.sessions[username] = client
            else:
                raise HTTPException(status_code=401, detail=f"@{username} oturumu bulunamadı.")

        return client

    async def logout(self, username: str):
        if username in self.sessions:
            try:
                await self.sessions[username].logout()
            except Exception:
                pass
            del self.sessions[username]

            cookie_file = os.path.join(self.cookies_dir, f"{username}.json")
            if os.path.exists(cookie_file):
                try:
                    os.remove(cookie_file)
                except Exception:
                    pass

sessions = SessionManager()

# Helper
def get_all_accounts():
    try:
        files = os.listdir(sessions.cookies_dir)
        return [f.replace('.json', '') for f in files if f.endswith('.json')]
    except Exception:
        return []

async def get_authed_client(account_name: str):
    return sessions.get_client(account_name)

# ==================== Request Models ====================
class LoginRequest(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    two_fa_secret: Optional[str] = None
    proxy: Optional[str] = None
    user_agent: Optional[str] = None

class UsernameRequest(BaseModel):
    username: str

class AccountInfoRequest(BaseModel):
    username: str

class TweetActionRequest(BaseModel):
    username: str
    tweet_id: str

class FollowActionRequest(BaseModel):
    username: str
    target_username: str

class TweetRequest(BaseModel):
    username: str
    text: str
    reply_to_id: Optional[str] = None

class TimelineRequest(BaseModel):
    username: str
    count: int = 20

class FollowListRequest(BaseModel):
    username: str
    target_username: Optional[str] = None
    count: int = 100

class SearchRequest(BaseModel):
    username: str
    query: str
    count: int = 20

class SearchVerifiedRequest(BaseModel):
    username: str
    keyword: str
    count: int = 20

class ProxyTestRequest(BaseModel):
    address: str
    port: str
    type: str = "http"
    username: Optional[str] = None
    password: Optional[str] = None

class BulkFollowRequest(BaseModel):
    username: str
    targets: List[str]
    delay: float = 3.0
    random_jitter: bool = True

class BulkUnfollowRequest(BaseModel):
    username: str
    count: int = 50
    delay: float = 3.0
    mode: str = "all"

class DeleteTweetRequest(BaseModel):
    username: str
    tweet_id: str

class BotDataRequest(BaseModel):
    url: str
    durum: str
    bot_id: str

class BoostStatsRequest(BaseModel):
    tweet_url: str

class BoostRequest(BaseModel):
    url: str

# ==================== Endpoints ====================

@app.get("/")
def root():
    return {"status": "X-KODCUM Backend Aktif", "version": "2.0.0"}

@app.get("/api/bot-report")
async def get_bot_report():
    return {"last_activities": activity_logs}

@app.get("/api/accounts")
async def list_accounts():
    return {"accounts": get_all_accounts()}

# ===== Auth =====
@app.post("/auth/login")
async def login(req: LoginRequest):
    return await sessions.login(req.username, req.password, req.email, req.two_fa_secret, req.proxy, req.user_agent)

@app.post("/auth/logout")
async def logout(req: UsernameRequest):
    await sessions.logout(req.username)
    return {"success": True}

@app.post("/auth/account-info")
async def account_info(req: AccountInfoRequest):
    client = sessions.get_client(req.username)
    me = await client.user()
    return {
        "success": True,
        "name": me.name,
        "username": me.screen_name,
        "followers_count": getattr(me, "followers_count", 0),
        "profile_image_url": getattr(me, "profile_image_url", None),
    }

# ===== Actions =====
@app.post("/actions/tweet")
async def post_tweet(req: TweetRequest):
    client = sessions.get_client(req.username)
    result = await client.create_tweet(text=req.text)
    internal_log(f"Tweet atıldı", "TWEET", "success")
    return {"success": True}

# ===== Data / Scraping =====
@app.post("/data/followers")
async def get_followers(req: FollowListRequest):
    client = sessions.get_client(req.username)
    user = await client.get_user_by_screen_name(req.target_username or req.username)
    followers = await client.get_user_followers(user.id, count=req.count)
    return {"success": True, "users": [{"username": u.screen_name} for u in followers]}

# ===== Bulk Actions =====
@app.post("/bulk/follow")
async def bulk_follow(req: BulkFollowRequest):
    client = sessions.get_client(req.username)
    # ... logic ...
    return {"success": True}

# ===== Proxy Test =====
@app.post("/proxy/test")
async def test_proxy(req: ProxyTestRequest):
    # ... proxy logic ...
    return {"success": True, "alive": True}

# ===== Telegram Handler =====
from aiogram import Bot, Dispatcher
import threading

TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN", "8171303759:AAGWubdCE5SVSHCtPfbKSfu1Guk_TfFwJbQ")
tg_bot = Bot(token=TELEGRAM_TOKEN)
dp = Dispatcher()

def run_telegram_bot():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(dp.start_polling(tg_bot))
    except:
        pass

threading.Thread(target=run_telegram_bot, daemon=True).start()

# ==================== Startup ====================
if __name__ == "__main__":
    import uvicorn
    # Vercel/Render gibi platformlar için portu ENV'den al, yoksa 10000 yap
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
