from fastapi import APIRouter, HTTPException, Response, Request
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
import httpx
import uuid
import os

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Emergent Auth endpoint
EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


class GoogleCallbackRequest(BaseModel):
    session_id: str


@router.post("/google/callback")
async def google_callback(request: GoogleCallbackRequest, response: Response):
    """
    Exchange Google OAuth session_id for user data
    """
    try:
        # Call Emergent Auth API to get user data
        async with httpx.AsyncClient() as client:
            auth_response = await client.get(
                EMERGENT_AUTH_URL,
                headers={"X-Session-ID": request.session_id},
                timeout=10.0
            )
            
            if auth_response.status_code != 200:
                raise HTTPException(
                    status_code=401,
                    detail="Invalid session_id or authentication failed"
                )
            
            user_data = auth_response.json()
        
        # Extract user info
        email = user_data.get("email")
        name = user_data.get("name")
        picture = user_data.get("picture")
        session_token = user_data.get("session_token")
        
        if not email or not session_token:
            raise HTTPException(status_code=400, detail="Missing required user data")
        
        # Store user in mock data (in production, this would be MongoDB)
        # For now, we'll use a simple in-memory storage
        from mock_auth import save_oauth_user, save_session
        
        user_id = await save_oauth_user(email, name, picture)
        await save_session(user_id, session_token)
        
        # Set httpOnly cookie with session_token
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=os.environ.get("COOKIE_SECURE", "true").lower() == "true",
            samesite="lax",
            max_age=7 * 24 * 60 * 60,  # 7 days
            path="/"
        )
        
        return {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "message": "Authentication successful"
        }
        
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to connect to authentication service: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Authentication error: {str(e)}"
        )


@router.get("/me")
async def get_current_user(request: Request):
    """
    Get current user from session token (cookie or header)
    """
    # Try to get session_token from cookie first
    session_token = request.cookies.get("session_token")
    
    # Fallback to Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.replace("Bearer ", "")
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Verify session and get user
    from mock_auth import get_user_by_session
    
    user = await get_user_by_session(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    return user


@router.post("/logout")
async def logout(request: Request, response: Response):
    """
    Logout user and clear session
    """
    session_token = request.cookies.get("session_token")
    
    if session_token:
        from mock_auth import delete_session
        await delete_session(session_token)
    
    # Clear cookie
    response.delete_cookie(key="session_token", path="/")
    
    return {"message": "Logged out successfully"}
