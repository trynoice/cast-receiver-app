import { JanuaryCdnClient } from './api/cdn';
import { CastApiHelper } from './cast-api-helper';
import { SoundPlayerManager } from './sound-player-manager';
import UiManager from './ui-manager';

window.addEventListener('DOMContentLoaded', main);

function main() {
  const app = new App();
  app.start();
}

class App {
  private static readonly IDLE_TIMEOUT_MILLIS = 5 * 60 * 1000;

  private readonly castApiHelper = new CastApiHelper(
    (event) => this.onSoundControlEvent(event),
    (event) => this.onUiUpdateEvent(event),
    () => this.stop()
  );

  private readonly soundPlayerManager = new SoundPlayerManager(
    new JanuaryCdnClient(() => this.castApiHelper.requestSenderForAccessToken())
  );

  private readonly uiManager = new UiManager();
  private idleTimeout?: ReturnType<typeof setTimeout>;

  public async start() {
    this.uiManager.setState('loading');
    this.soundPlayerManager.setSoundStateListener((soundId, state) => {
      this.castApiHelper.sendSoundStateChangedEvent(soundId, state);
      if (this.soundPlayerManager.isIdle()) {
        this.setIdleTimeout();
      } else {
        clearTimeout(this.idleTimeout);
      }
    });

    await this.castApiHelper.start();
    this.uiManager.setEnabled(this.castApiHelper.isDisplaySupported());
    this.uiManager.setState('stopped');
    this.setIdleTimeout();
  }

  private setIdleTimeout() {
    clearTimeout(this.idleTimeout);
    this.idleTimeout = setTimeout(() => this.stop(), App.IDLE_TIMEOUT_MILLIS);
  }

  private stop() {
    this.soundPlayerManager.setSoundStateListener(null);
    this.soundPlayerManager.stop();
    this.castApiHelper.stop();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private onSoundControlEvent(event?: any) {
    switch (event?.kind) {
      case 'SetSoundFadeInDuration':
        this.soundPlayerManager.setSoundFadeInDurationMillis(
          event.soundId,
          event.durationMillis
        );
        break;
      case 'SetSoundFadeOutDuration':
        this.soundPlayerManager.setSoundFadeOutDurationMillis(
          event.soundId,
          event.durationMillis
        );
        break;
      case 'EnableSoundPremiumSegments':
        this.soundPlayerManager.setSoundPremiumSegmentsEnabled(
          event.soundId,
          event.isEnabled
        );
        break;
      case 'SetSoundAudioBitrate':
        this.soundPlayerManager.setSoundAudioBitrate(
          event.soundId,
          event.bitrate
        );
        break;
      case 'SetSoundVolume':
        this.soundPlayerManager.setSoundVolume(event.soundId, event.volume);
        break;
      case 'PlaySound':
        this.soundPlayerManager.playSound(event.soundId);
        break;
      case 'PauseSound':
        this.soundPlayerManager.pauseSound(event.soundId, event.immediate);
        break;
      case 'StopSound':
        this.soundPlayerManager.stopSound(event.soundId, event.immediate);
        break;
      default:
        throw new Error(`unknown sound control event kind '${event?.kind}'`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private onUiUpdateEvent(event?: any) {
    switch (event?.kind) {
      case 'GlobalUiUpdated':
        this.uiManager.setState(event.state);
        this.uiManager.setVolume(event.volume);
        break;
      case 'SoundUiUpdated':
        this.uiManager.setSoundState(event.soundId, event.state, event.volume);
        break;
      case 'PresetNameUpdated':
        this.uiManager.setPresetName(event.name);
        break;
      default:
        throw new Error(`unknown ui update event kind '${event?.kind}'`);
    }
  }
}
