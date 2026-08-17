import { useCallback, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { WebView } from 'react-native-webview'
import type { WebViewNavigation } from 'react-native-webview'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

const INK = '#1A1614'
const WARM_400 = '#B8AF9F'
const RETURN_PATTERNS = [/\/reset-password-done|\/password.*success/i]

function isReturnUrl(url: string): boolean {
  return RETURN_PATTERNS.some((re) => re.test(url))
}

/**
 * Réinitialisation mot de passe dans un WebView (comme fedapay payment).
 * Charge le formulaire forgot-password React Native en HTML
 * (ou une URL Laravel si disponible).
 */
export default function ForgotPasswordWebViewScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>()
  const router = useRouter()

  // Récupère l'URL de l'API depuis la config Expo
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000/api'

  const [loading, setLoading] = useState(true)
  const canGoBackRef = useRef(false)
  const webRef = useRef<WebView>(null)
  const firstPaintRef = useRef(false)
  const doneRef = useRef(false)

  const revealPage = useCallback(() => {
    firstPaintRef.current = true
    setLoading(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(revealPage, 3000)
      return () => clearTimeout(t)
    }, [revealPage]),
  )

  const finish = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    router.back()
  }, [router])

  const confirmQuit = useCallback(() => {
    if (doneRef.current) return
    Alert.alert(
      'Quitter la réinitialisation ?',
      'Tes modifications ne seront pas sauvegardées.',
      [
        { text: 'Continuer', style: 'cancel' },
        { text: 'Quitter', style: 'destructive', onPress: finish },
      ],
    )
  }, [finish])

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (canGoBackRef.current) {
          webRef.current?.goBack()
          return true
        }
        confirmQuit()
        return true
      })
      return () => sub.remove()
    }, [confirmQuit]),
  )

  function onNav(nav: WebViewNavigation) {
    canGoBackRef.current = nav.canGoBack
    if (isReturnUrl(nav.url)) {
      finish()
    }
  }

  // Génère l'HTML du formulaire forgot-password
  // Peut être remplacé par une URL Laravel si disponible
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Réinitialiser mon mot de passe</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif;
          background: #1A1614;
          color: #1A1614;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 20px;
        }
        .container {
          width: 100%;
          max-width: 500px;
          background: #EEE8DC;
          border-radius: 24px;
          padding: 48px 24px;
        }
        h1 {
          font-size: 24px;
          font-weight: 800;
          margin-bottom: 8px;
          color: #1A1614;
        }
        .subtitle {
          font-size: 14px;
          color: #B8AF9F;
          margin-bottom: 32px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        label {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1px;
          color: #B8AF9F;
          text-transform: uppercase;
          display: block;
          margin-bottom: 8px;
        }
        input {
          width: 100%;
          height: 56px;
          border: 2px solid #B8AF9F;
          border-radius: 16px;
          padding: 12px 16px;
          font-size: 16px;
          color: #1A1614;
          font-family: inherit;
        }
        input::placeholder {
          color: #B8AF9F;
        }
        .error-message {
          background: rgba(212, 5, 17, 0.1);
          border: 2px solid rgba(212, 5, 17, 0.3);
          border-radius: 16px;
          padding: 12px;
          margin-bottom: 20px;
          display: none;
          color: #D40511;
          font-size: 14px;
          font-weight: 600;
        }
        .error-message.show {
          display: block;
        }
        .button {
          width: 100%;
          height: 56px;
          background: #2D2D2D;
          border: none;
          border-radius: 16px;
          color: #FFCC00;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s;
          font-family: inherit;
        }
        .button:active {
          opacity: 0.8;
        }
        .button:disabled {
          opacity: 0.5;
        }
        .loading {
          display: none;
          text-align: center;
          margin-bottom: 20px;
        }
        .spinner {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255, 204, 0, 0.3);
          border-top-color: #FFCC00;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Réinitialiser mon mot de passe</h1>
        <p class="subtitle">Saisis l'adresse email associée à ton compte</p>
        
        <div class="error-message" id="errorMsg"></div>
        
        <form id="form">
          <div class="form-group">
            <label for="email">Email</label>
            <input 
              type="email" 
              id="email" 
              name="email"
              placeholder="vous@example.com"
              value="${email || ''}"
              required
            />
          </div>
          
          <div class="loading" id="loading">
            <div class="spinner"></div>
          </div>
          
          <button type="submit" class="button" id="submitBtn">
            Envoyer le lien
          </button>
        </form>
      </div>

      <script>
        const form = document.getElementById('form');
        const submitBtn = document.getElementById('submitBtn');
        const errorMsg = document.getElementById('errorMsg');
        const loading = document.getElementById('loading');

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          errorMsg.classList.remove('show');
          errorMsg.textContent = '';
          
          const email = document.getElementById('email').value.trim();
          
          if (!email || !email.includes('@')) {
            errorMsg.textContent = 'Veuillez entrer une adresse email valide.';
            errorMsg.classList.add('show');
            return;
          }

          submitBtn.disabled = true;
          loading.style.display = 'block';

          try {
            const response = await fetch(
              '${apiBaseUrl}/auth/password/forgot',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
                body: JSON.stringify({ email }),
              }
            );

            if (!response.ok) {
              throw new Error('Erreur serveur');
            }

            // Redirection après succès
            setTimeout(() => {
              window.location.href = '/reset-password-done';
            }, 1500);
          } catch (err) {
            errorMsg.textContent = err.message || 'Impossible d\\'envoyer le lien. Réessaie.';
            errorMsg.classList.add('show');
            submitBtn.disabled = false;
            loading.style.display = 'none';
          }
        });
      </script>
    </body>
    </html>
  `

  return (
    <SafeAreaView className="flex-1 bg-ink" edges={['top', 'bottom']}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-warm-400/20">
        <TouchableOpacity onPress={confirmQuit} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#F4EFE4" />
        </TouchableOpacity>
        <Text className="text-base font-bold text-warm-400">Réinitialiser mon mot de passe</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* WebView */}
      {loading && (
        <View className="flex-1 bg-ink items-center justify-center">
          <ActivityIndicator color="#FFCC00" size="large" />
        </View>
      )}
      
      <WebView
        ref={webRef}
        source={{ html: htmlContent }}
        onNavigationStateChange={onNav}
        onLoadEnd={() => {
          if (!firstPaintRef.current) revealPage()
        }}
        style={{ opacity: loading ? 0 : 1 }}
        javaScriptEnabled={true}
        startInLoadingState={true}
        renderLoading={() => null}
        originWhitelist={['*']}
        mixedContentMode="always"
      />
    </SafeAreaView>
  )
}
