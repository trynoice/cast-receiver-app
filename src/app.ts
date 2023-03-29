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

  private readonly castApiHelper = new CastApiHelper((command) =>
    this.onSoundControllerCommand(command)
  );

  private readonly soundPlayerManager = new SoundPlayerManager(
    new JanuaryCdnClient(() => this.castApiHelper.requestSenderForAccessToken())
  );

  private readonly uiManager = new UiManager();
  private idleTimeout?: ReturnType<typeof setTimeout>;

  public async start() {
    this.uiManager.setState('loading');
    this.soundPlayerManager.setSoundStateListener((soundId, state) => {
      this.castApiHelper.sendSoundStateChangeEvent(soundId, state);
      if (this.soundPlayerManager.isIdle()) {
        this.idleTimeout = setTimeout(
          () => this.stop(),
          App.IDLE_TIMEOUT_MILLIS
        );
      } else {
        clearTimeout(this.idleTimeout);
      }
    });

    await this.castApiHelper.start();
    this.uiManager.setEnabled(this.castApiHelper.isDisplaySupported());
    this.uiManager.setState('stopped');
  }

  private stop() {
    this.soundPlayerManager.setSoundStateListener(null);
    this.soundPlayerManager.stop();
    this.castApiHelper.stop();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private onSoundControllerCommand(event?: any) {
    switch (event?.kind) {
      case 'SoundFadeInDurationUpdateCommand':
        this.soundPlayerManager.setSoundFadeInDurationMillis(
          event.soundId,
          event.durationMillis
        );
        break;
      case 'SoundFadeOutDurationUpdateCommand':
        this.soundPlayerManager.setSoundFadeOutDurationMillis(
          event.soundId,
          event.durationMillis
        );
        break;
      case 'SoundPremiumSegmentsEnableCommand':
        this.soundPlayerManager.setSoundPremiumSegmentsEnabled(
          event.soundId,
          event.isEnabled
        );
        break;
      case 'SoundAudioBitrateUpdateCommand':
        this.soundPlayerManager.setSoundAudioBitrate(
          event.soundId,
          event.bitrate
        );
        break;
      case 'SoundPlayCommand':
        this.soundPlayerManager.playSound(event.soundId);
        break;
      case 'SoundPauseCommand':
        this.soundPlayerManager.pauseSound(event.soundId, event.immediate);
        break;
      case 'SoundStopCommand':
        this.soundPlayerManager.stopSound(event.soundId, event.immediate);
        break;
      default:
        throw new Error(`unrecognised command kind '${event?.kind}'`);
    }
  }

  private onUiStateUpdateEvent(event: unknown) {
    // TODO
    console.log(event);
  }
}
