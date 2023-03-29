import type { MessageType } from 'chromecast-caf-receiver/cast.framework.system';

const NS_AUTH = 'urn:x-cast:com.github.ashutoshgngwr.noice:auth';
const NS_UI_STATE = 'urn:x-cast:com.github.ashutoshgngwr.noice:ui-state';
const NS_SOUND_CONTROLLER =
  'urn:x-cast:com.github.ashutoshgngwr.noice:sound-controller';

export default class CastApiHelper {
  private readonly context = cast.framework.CastReceiverContext.getInstance();

  public start(): Promise<void> {
    const namespaces: { [key: string]: MessageType } = {};
    namespaces[NS_AUTH] = cast.framework.system.MessageType.JSON;
    namespaces[NS_UI_STATE] = cast.framework.system.MessageType.JSON;
    namespaces[NS_SOUND_CONTROLLER] = cast.framework.system.MessageType.JSON;

    const options = new cast.framework.CastReceiverOptions();
    options.customNamespaces = namespaces;
    options.disableIdleTimeout = true;
    options.skipPlayersLoad = true;
    return new Promise((resolve) => {
      const l: SystemEventHandler = () => {
        this.context.removeEventListener(
          cast.framework.system.EventType.READY,
          l
        );

        resolve();
      };

      this.context.addEventListener(cast.framework.system.EventType.READY, l);
      this.context.start();
    });
  }

  public isDisplaySupported(): boolean {
    const dc = this.context.getDeviceCapabilities();
    return dc && dc[cast.framework.system.DeviceCapabilities.DISPLAY_SUPPORTED];
  }

  public async requestSenderForAccessToken(): Promise<string | undefined> {
    return new Promise((resolve, reject) => {
      let timeout: ReturnType<typeof setTimeout> | undefined = undefined;
      const listener: SystemEventHandler = (event) => {
        clearTimeout(timeout);
        this.context.removeCustomMessageListener(NS_AUTH, listener);
        const response: AccessTokenResponseEvent | undefined = event.data;
        if (response == null) {
          reject(new Response('received AccessTokenResponseEvent was null'));
        } else {
          resolve(response.accessToken);
        }
      };

      timeout = setTimeout(() => {
        this.context.removeCustomMessageListener(NS_AUTH, listener);
        reject(new Error('timed out while waiting for the new access token'));
      }, 15000);

      this.context.addCustomMessageListener(NS_AUTH, listener);
      this.context.sendCustomMessage(NS_AUTH, undefined, {
        kind: 'AccessTokenRequest',
      });
    });
  }
}

interface AccessTokenResponseEvent {
  kind: 'AccessTokenResponse';
  accessToken?: string;
}
