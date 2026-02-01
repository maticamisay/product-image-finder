import { NextResponse } from 'next/server';

// Credenciales de ML (en producción deberían estar en .env)
const ML_APP_ID = '6248000999838414';
const ML_CLIENT_SECRET = 'c02Z2z1Te6AX0wrJILrdqlF0tMm4Vs7r';
const ML_REDIRECT_URI = 'https://middas.app';

// Cache del token
let cachedToken: { token: string; expiresAt: number } | null = null;

export async function GET() {
  // Si tenemos token en cache y no expiró, devolverlo
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return NextResponse.json({ 
      access_token: cachedToken.token,
      cached: true 
    });
  }

  try {
    // Obtener nuevo token con client_credentials
    const response = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: ML_APP_ID,
        client_secret: ML_CLIENT_SECRET,
      }),
    });

    const data = await response.json();

    if (data.access_token) {
      // Cachear por 5 horas (el token dura 6)
      cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + (5 * 60 * 60 * 1000),
      };

      return NextResponse.json({ 
        access_token: data.access_token,
        expires_in: data.expires_in 
      });
    }

    return NextResponse.json({ error: 'No se pudo obtener token' }, { status: 500 });
  } catch (error) {
    console.error('Error getting ML token:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
