import type { CdnClient } from '@trynoice/january';
import type { CastReceiverContext } from 'chromecast-caf-receiver/cast.framework';

const CDN_ENDPOINT =
  process.env.NODE_ENV === 'production'
    ? 'https://cdn.trynoice.com'
    : 'https://cdn.staging.trynoice.com';

export class JanuaryCdnClient implements CdnClient {
  private readonly context: CastReceiverContext;
  private readonly authNamespace: string;
  private accessTokenRequestTimeout?: ReturnType<typeof setTimeout>;
  private accessToken?: string;

  public constructor(context: CastReceiverContext, authNamespace: string) {
    this.context = context;
    this.authNamespace = authNamespace;
  }

  public async getResource(path: string): Promise<Response> {
    const response = await this.tryResource(path);
    if (response.status !== 401) {
      return response;
    }

    await this.refreshAccessToken();
    return this.tryResource(path);
  }

  private tryResource(path: string): Promise<Response> {
    return fetch(`${CDN_ENDPOINT}/${path}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
  }

  private refreshAccessToken(): Promise<void> {
    return new Promise((resolve, reject) => {
      const listener: SystemEventHandler = (event) => {
        clearTimeout(this.accessTokenRequestTimeout);
        this.context.removeCustomMessageListener(this.authNamespace, listener);
        const response: AccessTokenResponseEvent | undefined = event.data;
        if (response == null) {
          reject(new Response('received AccessTokenResponseEvent was null'));
        } else {
          this.accessToken = response.accessToken;
          resolve();
        }
      };

      this.accessTokenRequestTimeout = setTimeout(() => {
        this.context.removeCustomMessageListener(this.authNamespace, listener);
        reject(new Error('timed out while waiting for the new access token'));
      }, 15000);

      this.context.addCustomMessageListener(this.authNamespace, listener);
      this.context.sendCustomMessage(this.authNamespace, undefined, {
        kind: 'AccessTokenRequest',
      });
    });
  }
}

interface AccessTokenResponseEvent {
  kind: 'AccessTokenResponse';
  accessToken?: string;
}
