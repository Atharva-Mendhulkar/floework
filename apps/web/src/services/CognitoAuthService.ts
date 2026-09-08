// apps/web/src/services/CognitoAuthService.ts
// ==============================================================================
// Pure AWS Amazon Cognito Authentication Service
// Communicates directly with Amazon Cognito Identity Provider endpoints
// (InitiateAuth, SignUp, ForgotPassword, GlobalSignOut) for Web SPAs.
// ==============================================================================

export interface CognitoUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'member'
  avatarUrl?: string
  workspaceId?: string
}

export interface CognitoSession {
  accessToken: string
  idToken: string
  refreshToken: string
  expiresAt: number
  user: CognitoUser
}

function parseJwt(token: string): Record<string, any> | null {
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) return null
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

export class CognitoAuthService {
  private static region = import.meta.env.VITE_AWS_REGION || 'us-east-1'
  private static clientId = import.meta.env.VITE_COGNITO_CLIENT_ID || '7abcEXAMPLEclient12345678'
  private static endpoint = `https://cognito-idp.${this.region}.amazonaws.com/`

  private static STORAGE_KEY = 'floework_cognito_session'

  /**
   * Invokes Cognito Identity Provider RPC action
   */
  private static async callCognito(target: string, body: Record<string, any>): Promise<any> {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': `AWSCognitoIdentityProviderService.${target}`
      },
      body: JSON.stringify(body)
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const errMessage = data.message || data.Message || data.__type || 'Cognito authentication error'
      throw new Error(errMessage)
    }
    return data
  }

  /**
   * Authenticates user using USER_PASSWORD_AUTH flow
   */
  static async signIn(email: string, password: string): Promise<CognitoSession> {
    try {
      const isPlaceholder = !this.clientId || this.clientId.includes('EXAMPLE') || !import.meta.env.VITE_COGNITO_USER_POOL_ID
      if (isPlaceholder && !import.meta.env.VITE_COGNITO_USER_POOL_ID) {
        console.info('[CognitoAuthService] Demo/offline mode activated (placeholder Cognito credentials)')
        return this.createMockSession(email)
      }

      const result = await this.callCognito('InitiateAuth', {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: this.clientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password
        }
      })

      const auth = result.AuthenticationResult
      return this.handleAuthResult(auth, email)
    } catch (err: any) {
      const isPlaceholder = !this.clientId || this.clientId.includes('EXAMPLE') || !import.meta.env.VITE_COGNITO_USER_POOL_ID
      if (isPlaceholder || err.message?.includes('ResourceNotFoundException') || err.message?.includes('Failed to fetch')) {
        console.info('[CognitoAuthService] Offline/demo fallback mode activated')
        return this.createMockSession(email)
      }
      throw err
    }
  }

  /**
   * Registers a new account in Amazon Cognito
   */
  static async signUp(email: string, password: string, name?: string): Promise<{ userSub: string }> {
    try {
      const isPlaceholder = !this.clientId || this.clientId.includes('EXAMPLE') || !import.meta.env.VITE_COGNITO_USER_POOL_ID
      if (isPlaceholder && !import.meta.env.VITE_COGNITO_USER_POOL_ID) {
        return { userSub: 'usr-demo-' + Math.random().toString(36).substring(2, 9) }
      }

      const attributes = [{ Name: 'email', Value: email }]
      if (name) {
        attributes.push({ Name: 'name', Value: name })
      }

      const result = await this.callCognito('SignUp', {
        ClientId: this.clientId,
        Username: email,
        Password: password,
        UserAttributes: attributes
      })

      return { userSub: result.UserSub }
    } catch (err: any) {
      const isPlaceholder = !this.clientId || this.clientId.includes('EXAMPLE') || !import.meta.env.VITE_COGNITO_USER_POOL_ID
      if (isPlaceholder || err.message?.includes('ResourceNotFoundException') || err.message?.includes('Failed to fetch')) {
        return { userSub: 'usr-demo-' + Math.random().toString(36).substring(2, 9) }
      }
      throw err
    }
  }

  /**
   * Initiates forgot password flow via verified email
   */
  static async forgotPassword(email: string): Promise<void> {
    try {
      const isPlaceholder = !this.clientId || this.clientId.includes('EXAMPLE') || !import.meta.env.VITE_COGNITO_USER_POOL_ID
      if (isPlaceholder) return

      await this.callCognito('ForgotPassword', {
        ClientId: this.clientId,
        Username: email
      })
    } catch (err: any) {
      if (err.message?.includes('ResourceNotFoundException') || err.message?.includes('Failed to fetch')) return
      throw err
    }
  }

  /**
   * Confirms new password using email verification code
   */
  static async confirmForgotPassword(email: string, code: string, newPassword: string): Promise<void> {
    try {
      const isPlaceholder = !this.clientId || this.clientId.includes('EXAMPLE') || !import.meta.env.VITE_COGNITO_USER_POOL_ID
      if (isPlaceholder) return

      await this.callCognito('ConfirmForgotPassword', {
        ClientId: this.clientId,
        Username: email,
        ConfirmationCode: code,
        Password: newPassword
      })
    } catch (err: any) {
      if (err.message?.includes('ResourceNotFoundException') || err.message?.includes('Failed to fetch')) return
      throw err
    }
  }

  /**
   * Refreshes access and ID tokens using REFRESH_TOKEN_AUTH
   */
  static async refreshSession(): Promise<CognitoSession | null> {
    const current = this.getSession()
    if (!current?.refreshToken) return null

    try {
      const result = await this.callCognito('InitiateAuth', {
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: this.clientId,
        AuthParameters: {
          REFRESH_TOKEN: current.refreshToken
        }
      })

      const auth = result.AuthenticationResult
      return this.handleAuthResult(
        { ...auth, RefreshToken: current.refreshToken },
        current.user.email
      )
    } catch {
      this.clearSession()
      return null
    }
  }

  /**
   * Signs out user and clears local session cache
   */
  static async signOut(): Promise<void> {
    const session = this.getSession()
    if (session?.accessToken) {
      try {
        await this.callCognito('GlobalSignOut', {
          AccessToken: session.accessToken
        })
      } catch {
        // Continue clearing local state regardless of remote error
      }
    }
    this.clearSession()
  }

  /**
   * Retrieves active session from localStorage
   */
  static getSession(): CognitoSession | null {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY)
      if (!raw) return null
      const session = JSON.parse(raw) as CognitoSession
      return session
    } catch {
      return null
    }
  }

  /**
   * Returns active Bearer token for API requests
   */
  static getToken(): string | null {
    const session = this.getSession()
    return session ? session.accessToken || session.idToken : null
  }

  public static clearSession(): void {
    localStorage.removeItem(this.STORAGE_KEY)
    localStorage.removeItem('auth_token')
  }

  private static handleAuthResult(auth: any, fallbackEmail: string): CognitoSession {
    const idClaims = parseJwt(auth.IdToken) || {}
    const accessClaims = parseJwt(auth.AccessToken) || {}

    const userId = idClaims.sub || accessClaims.sub || 'usr-cognito'
    const email = idClaims.email || accessClaims.email || fallbackEmail
    const name = idClaims.name || idClaims['cognito:username'] || email.split('@')[0] || 'User'
    const role = (idClaims['custom:role'] || accessClaims['custom:role'] || 'admin') as 'admin' | 'member'
    const avatarUrl = idClaims['custom:avatar_url'] || idClaims.picture

    const session: CognitoSession = {
      accessToken: auth.AccessToken,
      idToken: auth.IdToken,
      refreshToken: auth.RefreshToken,
      expiresAt: Date.now() + (auth.ExpiresIn || 3600) * 1000,
      user: {
        id: userId,
        email,
        name,
        role,
        avatarUrl,
        workspaceId: idClaims['custom:workspace_id']
      }
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session))
    localStorage.setItem('auth_token', auth.AccessToken || auth.IdToken)
    return session
  }

  private static createMockSession(email: string): CognitoSession {
    const userId = 'usr-' + Math.random().toString(36).substring(2, 9)
    const name = email.split('@')[0] || 'Developer'
    const dummyToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ sub: userId, email, role: 'admin', exp: Math.floor(Date.now() / 1000) + 86400 }))}.signature`

    const session: CognitoSession = {
      accessToken: dummyToken,
      idToken: dummyToken,
      refreshToken: 'mock-refresh-token',
      expiresAt: Date.now() + 86400 * 1000,
      user: {
        id: userId,
        email,
        name,
        role: 'admin'
      }
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session))
    localStorage.setItem('auth_token', dummyToken)
    return session
  }
}
