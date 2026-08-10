/**
 * reCAPTCHA Firebase pour React Native (WebView).
 * Mode visible — fiable sous Expo Go.
 */
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'
import type { FirebaseOptions } from 'firebase/app'
import type { ApplicationVerifier } from 'firebase/auth'

export type FirebaseRecaptchaRef = ApplicationVerifier & {
  cancel: () => void
}

type Props = {
  firebaseConfig: FirebaseOptions
  languageCode?: string
  title?: string
  cancelLabel?: string
}

function buildHtml(firebaseConfig: FirebaseOptions, languageCode?: string): string {
  const lang = languageCode ? `firebase.auth().languageCode = '${languageCode}';` : ''
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"><\/script>
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"><\/script>
  <style>
    html,body{height:100%;margin:0;padding:16px;background:#FDFCF9;font-family:system-ui,-apple-system,sans-serif}
    h1{font-size:16px;margin:0 0 12px;color:#1A1614}
    #recaptcha-cont{display:flex;justify-content:center;padding-top:8px;min-height:80px}
  </style>
</head>
<body>
  <h1>Coche la case pour continuer</h1>
  <div id="recaptcha-cont"></div>
  <script>
    function post(msg){ window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }
    function onVerify(token){ post({type:'verify',token:token}); }
    function onError(err){ post({type:'error', message: String(err && err.message || err || 'error')}); }
    try {
      firebase.initializeApp(${JSON.stringify(firebaseConfig)});
      ${lang}
      window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-cont', {
        size: 'normal',
        callback: onVerify,
        'expired-callback': function(){ post({type:'error', message:'expired'}); }
      });
      window.recaptchaVerifier.render().then(function(){
        post({type:'load'});
      }).catch(onError);
    } catch (e) { onError(e); }
  <\/script>
</body>
</html>`
}

const FirebaseRecaptchaVerifierModal = forwardRef<FirebaseRecaptchaRef, Props>(
  function FirebaseRecaptchaVerifierModal(
    {
      firebaseConfig,
      languageCode = 'fr',
      title = 'Vérification anti-robot',
      cancelLabel = 'Annuler',
    },
    ref,
  ) {
    const [visible, setVisible] = useState(false)
    const [loaded, setLoaded] = useState(false)
    const resolveRef = useRef<((token: string) => void) | null>(null)
    const rejectRef = useRef<((err: Error) => void) | null>(null)
    const webRef = useRef<WebView>(null)

    const authDomain = firebaseConfig.authDomain
    if (!authDomain) {
      throw new Error('firebaseConfig.authDomain manquant')
    }

    const finish = useCallback((token: string) => {
      resolveRef.current?.(token)
      resolveRef.current = null
      rejectRef.current = null
      setVisible(false)
      setLoaded(false)
    }, [])

    const fail = useCallback((message: string) => {
      rejectRef.current?.(new Error(message))
      resolveRef.current = null
      rejectRef.current = null
      setVisible(false)
      setLoaded(false)
    }, [])

    useImperativeHandle(
      ref,
      () => ({
        get type() {
          return 'recaptcha'
        },
        _reset() {},
        async verify() {
          return new Promise<string>((resolve, reject) => {
            resolveRef.current = resolve
            rejectRef.current = reject
            setLoaded(false)
            setVisible(true)
          })
        },
        cancel() {
          fail('Vérification annulée')
        },
      }),
      [fail],
    )

    function onMessage(event: WebViewMessageEvent) {
      try {
        const data = JSON.parse(event.nativeEvent.data) as {
          type: string
          token?: string
          message?: string
        }
        switch (data.type) {
          case 'load':
            setLoaded(true)
            break
          case 'error':
            fail(data.message ? `reCAPTCHA: ${data.message}` : 'Échec du chargement reCAPTCHA')
            break
          case 'verify':
            if (data.token) finish(data.token)
            else fail('Token reCAPTCHA manquant')
            break
        }
      } catch {
        fail('Message reCAPTCHA invalide')
      }
    }

    const source = {
      baseUrl: `https://${authDomain}`,
      html: buildHtml(firebaseConfig, languageCode),
    }

    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => fail('Vérification annulée')}
      >
        <View style={styles.modal}>
          <View style={styles.header}>
            <Pressable onPress={() => fail('Vérification annulée')} hitSlop={12} style={styles.cancel}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Text style={styles.title}>{title}</Text>
          </View>
          <View style={styles.content}>
            {visible ? (
              <WebView
                ref={webRef}
                source={source}
                onMessage={onMessage}
                javaScriptEnabled
                domStorageEnabled
                originWhitelist={['*']}
                mixedContentMode="always"
                setSupportMultipleWindows={false}
                style={StyleSheet.absoluteFill}
                onError={(e) => {
                  fail(e.nativeEvent.description || 'WebView error')
                }}
              />
            ) : null}
            {!loaded && (
              <View style={styles.loader}>
                <ActivityIndicator color="#1A1614" />
                <Text style={styles.loaderText}>Chargement reCAPTCHA…</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    )
  },
)

export default FirebaseRecaptchaVerifierModal

const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: '#FDFCF9' },
  header: {
    height: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#CECECE',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  cancel: { position: 'absolute', left: 12 },
  cancelText: { color: '#1A1614', fontWeight: '600' },
  title: { fontWeight: '800', color: '#1A1614', fontSize: 15 },
  content: { flex: 1 },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    paddingTop: 32,
    backgroundColor: 'rgba(253,252,249,0.85)',
  },
  loaderText: { marginTop: 12, color: '#8A7E68', fontSize: 13 },
})
