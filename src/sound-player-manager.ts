import { SoundPlayer, SoundPlayerState, CdnClient } from '@trynoice/january';

export class SoundPlayerManager {
  private readonly soundPlayers = new Map<string, SoundPlayer>();
  private readonly cdnClient: CdnClient;

  private soundStateListenerCallback?: SoundStateListenerCallback | null;

  public constructor(cdnClient: CdnClient) {
    this.cdnClient = cdnClient;
  }

  public setSoundFadeInDurationMillis(soundId: string, millis: number) {
    this.getOrInitSoundPlayer(soundId).setFadeInSeconds(millis / 1000.0);
  }

  public setSoundFadeOutDurationMillis(soundId: string, millis: number) {
    this.getOrInitSoundPlayer(soundId).setFadeOutSeconds(millis / 1000.0);
  }

  public setSoundPremiumSegmentsEnabled(soundId: string, enabled: boolean) {
    this.getOrInitSoundPlayer(soundId).setPremiumSegmentsEnabled(enabled);
  }

  public setSoundAudioBitrate(soundId: string, bitrate: string) {
    this.getOrInitSoundPlayer(soundId).setAudioBitrate(bitrate);
  }

  public setSoundVolume(soundId: string, volume: number) {
    this.getOrInitSoundPlayer(soundId).setVolume(volume);
  }

  public playSound(soundId: string) {
    this.getOrInitSoundPlayer(soundId).play();
  }

  public pauseSound(soundId: string, immediate: boolean) {
    this.getOrInitSoundPlayer(soundId).pause(immediate);
  }

  public stopSound(soundId: string, immediate: boolean) {
    this.getOrInitSoundPlayer(soundId).stop(immediate);
  }

  public stop() {
    this.soundPlayers.forEach((soundPlayer) => soundPlayer.stop(true));
  }

  public setSoundStateListener(callback: SoundStateListenerCallback | null) {
    this.soundStateListenerCallback = callback;
  }

  public isIdle(): boolean {
    return this.soundPlayers.size === 0;
  }

  private getOrInitSoundPlayer(soundId: string): SoundPlayer {
    if (!this.soundPlayers.has(soundId)) {
      const p = new SoundPlayer(this.cdnClient, soundId);
      const l = () => {
        const s = p.getState();
        if (s === SoundPlayerState.Stopped) {
          p.removeEventListener(SoundPlayer.EVENT_STATE_CHANGE, l);
          this.soundPlayers.delete(soundId);
        }

        this.soundStateListenerCallback?.call(undefined, soundId, s);
      };

      p.addEventListener(SoundPlayer.EVENT_STATE_CHANGE, l);
      this.soundPlayers.set(soundId, p);
    }

    const p = this.soundPlayers.get(soundId);
    if (p == null) {
      throw new Error('player must not be null');
    }

    return p;
  }
}

export type SoundStateListenerCallback = (
  soundId: string,
  state: SoundPlayerState
) => void;
