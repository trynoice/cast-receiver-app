import type { MessageType } from 'chromecast-caf-receiver/cast.framework.system';

const NS_AUTH = 'urn:x-cast:com.github.ashutoshgngwr.noice:auth';
const NS_UI_UPDATES = 'urn:x-cast:com.github.ashutoshgngwr.noice:ui-updates';
const NS_SOUNDS = 'urn:x-cast:com.github.ashutoshgngwr.noice:sounds';

export class CastApiHelper {
  private readonly context = cast.framework.CastReceiverContext.getInstance();

  public constructor(
    soundControlEventHandler: SoundControlEventHandler,
    uiUpdateEventHandler: UiUpdateEventHandler
  ) {
    this.context.addCustomMessageListener(NS_SOUNDS, (event) =>
      soundControlEventHandler.call(undefined, event.data)
    );

    this.context.addCustomMessageListener(NS_UI_UPDATES, (event) =>
      uiUpdateEventHandler.call(undefined, event.data)
    );
  }

  public start(): Promise<void> {
    const namespaces: { [key: string]: MessageType } = {};
    namespaces[NS_AUTH] = cast.framework.system.MessageType.JSON;
    namespaces[NS_UI_UPDATES] = cast.framework.system.MessageType.JSON;
    namespaces[NS_SOUNDS] = cast.framework.system.MessageType.JSON;

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
      this.context.start(options);
    });
  }

  public stop() {
    this.context.stop();
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
        if (event.data?.kind === 'GetAccessTokenResponse') {
          resolve(event.data.accessToken);
        }
      };

      timeout = setTimeout(() => {
        this.context.removeCustomMessageListener(NS_AUTH, listener);
        reject(new Error('timed out while waiting for the new access token'));
      }, 15000);

      this.context.addCustomMessageListener(NS_AUTH, listener);
      this.context.sendCustomMessage(NS_AUTH, undefined, {
        kind: 'GetAccessToken',
      });
    });
  }

  public sendSoundStateChangedEvent(soundId: string, state: string) {
    this.context.sendCustomMessage(NS_SOUNDS, undefined, {
      kind: 'SoundStateChanged',
      soundId: soundId,
      state: state,
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SoundControlEventHandler = (event?: any) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UiUpdateEventHandler = (event?: any) => void;
