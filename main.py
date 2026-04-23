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

# Disabled auto-initialize during import to avoid blocking the Express spawn
# initialize_vps()

from playwright.async_api import async_playwright
from playwright_stealth import Stealth
from fake_useragent import UserAgent

# Dinamik User-Agent Üretici
ua_factory = UserAgent()

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

# CORS ayarlarını Vite (5173 / 3000) için güncelle
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
            client._user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

            if user_agent:
                client._user_agent = user_agent
            elif 'ua_factory' in globals():
                client._user_agent = ua_factory.random

            if proxy:
                client.set_proxy(proxy)

            cookie_file = os.path.join(self.cookies_dir, f"{username}.json")

            if os.path.exists(cookie_file):
                print(f"🔄 @{username} için çerez dosyası bulundu. Yükleniyor...")
                client.load_cookies(cookie_file)
                self.sessions[username] = client
                me = await client.user()
                print(f"✅ @{username} başarıyla çerezden yüklendi.")
                internal_log(f"@{username} çerezden yüklendi", "AUTH", "success")
                return {"success": True, "message": "Kayıtlı çerezlerle giriş yapıldı", "user": {"name": me.name, "username": me.screen_name}}

            print(f"🔑 @{username} için İLK GİRİŞ başlatılıyor...")
            await client.login(
                auth_info_1=username,
                auth_info_2=email,
                password=password,
                totp_secret=two_fa_secret
            )

            client.save_cookies(cookie_file)
            self.sessions[username] = client
            me = await client.user()
            print(f"💾 @{username} oturumu başarıyla oluşturuldu.")
            internal_log(f"@{username} giriş başarılı", "AUTH", "success")

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
            internal_log(f"@{username} giriş hatası: {str(e)}", "AUTH", "error")
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
            del self.sessions[username]
            cookie_file = os.path.join(self.cookies_dir, f"{username}.json")
            if os.path.exists(cookie_file):
                os.remove(cookie_file)
            internal_log(f"@{username} oturumu kapatıldı", "AUTH", "info")

sessions = SessionManager()

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

class BoostStatsRequest(BaseModel):
    tweet_url: str

class BotDataRequest(BaseModel):
    url: str
    durum: str
    bot_id: str

# ==================== Endpoints ====================

@app.get("/")
def root():
    return {"status": "X-KODCUM Backend Aktif", "engine": "Twikit"}

@app.get("/api/bot-report")
async def get_bot_report():
    return {"last_activities": activity_logs}

@app.get("/api/accounts")
async def list_accounts():
    files = os.listdir(sessions.cookies_dir)
    return {"accounts": [f.replace('.json', '') for f in files if f.endswith('.json')]}

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
    try:
        me = await client.user()
        return {
            "success": True,
            "name": me.name,
            "username": me.screen_name,
            "followers_count": getattr(me, "followers_count", 0),
            "profile_image_url": getattr(me, "profile_image_url", None),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/actions/tweet")
async def post_tweet(req: TweetRequest):
    client = sessions.get_client(req.username)
    try:
        await asyncio.sleep(random.uniform(1.0, 3.0))
        if req.reply_to_id:
            result = await client.create_tweet(text=req.text, reply_to=req.reply_to_id)
        else:
            result = await client.create_tweet(text=req.text)
        
        t_id = getattr(result, 'id', 'GÖNDERİLDİ')
        internal_log(f"Tweet atıldı: {req.text[:20]}...", "TWEET", "success")
        return {"success": True, "tweet_id": t_id}
    except Exception as e:
        internal_log(f"Tweet hatası: {str(e)}", "TWEET", "error")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/boost-stats")
async def boost_stats_trigger(req: BoostStatsRequest):
    tweet_id = req.tweet_url.split("/")[-1].split("?")[0]
    accounts = [f.replace('.json', '') for f in os.listdir(sessions.cookies_dir) if f.endswith('.json')]
    
    internal_log(f"Boost başlatıldı: {tweet_id}", "BOOST", "info")
    
    # Simple background simulation or actual implementation
    async def run_boost():
        for acc in accounts:
            try:
                client = sessions.get_client(acc)
                await client.get_tweet_by_id(tweet_id)
                internal_log(f"@{acc} ile görüntülendi", "BOOST", "success")
                await asyncio.sleep(random.uniform(2, 5))
            except:
                pass
                
    asyncio.create_task(run_boost())
    return {"status": "started", "account_count": len(accounts)}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PYTHON_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
