"use client";

import { useEffect } from "react";

export default function OAuthCallback() {
  useEffect(() => {
    // Extract access token from URL fragment
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const state = params.get('state'); // shareId

    if (accessToken) {
      // Store token temporarily for parent window
      localStorage.setItem('google_access_token', accessToken);
      
      // Close popup
      if (window.opener) {
        window.close();
      } else {
        // If not popup, redirect back to session
        if (state) {
          window.location.href = `/s/${state}`;
        } else {
          window.location.href = '/';
        }
      }
    } else {
      // OAuth failed
      console.error("OAuth failed, no access token received");
      if (window.opener) {
        window.close();
      } else {
        window.location.href = '/';
      }
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-sm text-gray-600">Google 인증 처리 중...</p>
      </div>
    </div>
  );
}