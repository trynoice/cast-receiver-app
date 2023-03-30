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
    (command) => this.onSoundCommand(command),
    (command) => this.onUiUpdateCommand(command)
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
    this.idleTimeout = setTimeout(() => {
      this.soundPlayerManager.setSoundStateListener(null);
      this.soundPlayerManager.stop();
      this.castApiHelper.stop();
    }, App.IDLE_TIMEOUT_MILLIS);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private onSoundCommand(command?: any) {
    switch (command?.kind) {
      case 'SoundFadeInDurationUpdateCommand':
        this.soundPlayerManager.setSoundFadeInDurationMillis(
          command.soundId,
          command.durationMillis
        );
        break;
      case 'SoundFadeOutDurationUpdateCommand':
        this.soundPlayerManager.setSoundFadeOutDurationMillis(
          command.soundId,
          command.durationMillis
        );
        break;
      case 'SoundPremiumSegmentsEnableCommand':
        this.soundPlayerManager.setSoundPremiumSegmentsEnabled(
          command.soundId,
          command.isEnabled
        );
        break;
      case 'SoundAudioBitrateUpdateCommand':
        this.soundPlayerManager.setSoundAudioBitrate(
          command.soundId,
          command.bitrate
        );
        break;
      case 'SoundPlayCommand':
        this.soundPlayerManager.playSound(command.soundId);
        break;
      case 'SoundPauseCommand':
        this.soundPlayerManager.pauseSound(command.soundId, command.immediate);
        break;
      case 'SoundStopCommand':
        this.soundPlayerManager.stopSound(command.soundId, command.immediate);
        break;
      default:
        throw new Error(`unrecognised command kind '${command?.kind}'`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private onUiUpdateCommand(command?: any) {
    switch (command?.kind) {
      case 'SoundPlayerManagerUpdate':
        this.uiManager.setState(command.state);
        this.uiManager.setVolume(command.volume);
        break;
      case 'SoundPlayerUpdate':
        this.uiManager.setSoundState(
          command.soundId,
          command.state,
          command.volume
        );
    }
  }
}
