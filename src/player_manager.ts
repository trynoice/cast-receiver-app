import { Howl } from "howler";
import { Sounds } from "./library";
import { PlayerControlEvent, PlayerAction, PlayerManagerStatus } from "./types";

/**
 * PlayerManager manages various player instances for all the sounds. It also
 * implements a callback for subscribing to sender application messages
 * (bindings in index.ts). Based on these messages, it loads various sounds and
 * controls their playback. It also keeps track of idle status and runs an idle
 * timer that runs out on 5m of inactivity.
 */
export default class PlayerManager {
  private static readonly IDLE_TIMEOUT = 300 * 1000;
  private static readonly DEFAULT_FADE_DURATION = 1000;

  private players: Map<string, Howl> = new Map();
  private bufferingState: Set<string> = new Set();
  private idleTimer?: number;
  private onStatusUpdateCallback?: (status: PlayerManagerStatus) => void;

  constructor() {
    this.startIdleTimer();
  }

  /**
   * Starts a timer that invokes status callback with a
   * PlayerManagerStatusEvent.IdleTimedOut event on finish.
   */
  private startIdleTimer(): void {
    this.stopIdleTimer();
    this.idleTimer = window.setTimeout(() => {
      this.notifyStatusUpdate(PlayerManagerStatus.IdleTimedOut);
    }, PlayerManager.IDLE_TIMEOUT);
  }

  /**
   * stops idle timer
   */
  private stopIdleTimer(): void {
    window.clearTimeout(this.idleTimer);
  }

  /**
   * initializes a new Howl instance with the given parameters.
   * @param soundKey soundKey as passed by the sender app
   * @param isLooping whether the sound should loop
   * @param volume initial volume for the sound
   */
  private createPlayer(
    soundKey: string,
    isLooping: boolean,
    volume: number
  ): Howl {
    this.bufferingState.add(soundKey);
    return new Howl({
      src: Sounds[soundKey.substring(0, soundKey.length - 4)],
      autoplay: false,
      html5: false,
      loop: isLooping,
      pool: 1,
      volume: volume,
      preload: true,
    });
  }

  /**
   * start playback for a player. It waits for the Howl instance to be ready and
   * sound to be loaded before starting playback. It invokes the status callback
   * with a PlayerManagerStatusEvent.Playing event when the sound starts playing.
   */
  private play(soundKey: string, fadeDuration: number | undefined): void {
    if (this.players.has(soundKey) === false) {
      return;
    }

    const player = this.players.get(soundKey);
    if (!player) {
      return;
    }

    if (player.playing() === false) {
      player.once("play", (): void => {
        this.bufferingState.delete(soundKey);
        this.notifyStatusUpdate(PlayerManagerStatus.Playing);
        // fade-in only looping sounds because non-looping sounds need to
        // maintain their abruptness thingy.
        if (player.loop()) {
          player.fade(
            0,
            player.volume(),
            fadeDuration ?? PlayerManager.DEFAULT_FADE_DURATION
          );
        }
      });

      player.play();
    }
  }

  /**
   * Pauses the given player without destroying the Howl instance.
   */
  private pause(soundKey: string): void {
    if (this.players.has(soundKey) === false) {
      return;
    }

    const player = this.players.get(soundKey);
    if (!player) {
      return;
    }

    const originalVolume = player.volume();
    player.fade(originalVolume, 0, PlayerManager.DEFAULT_FADE_DURATION);
    player.once("fade", () => {
      player.pause();
      player.volume(originalVolume);
    });
  }

  /**
   * Stops a given player if it is playing. It also releases the underlying
   * resources regardless of the player's playing state.
   */
  private stop(soundKey: string): void {
    if (this.players.has(soundKey) === false) {
      return;
    }

    const player = this.players.get(soundKey);
    this.players.delete(soundKey);
    this.bufferingState.delete(soundKey);
    if (!player) {
      return;
    }

    if (player.playing()) {
      player.fade(player.volume(), 0, PlayerManager.DEFAULT_FADE_DURATION);
      player.once("fade", () => {
        player.stop();
        player.unload();
      });
    } else {
      player.stop();
      player.unload();
    }
  }

  /**
   * Sets volume for the given player. If the player is currently playing, it
   * fades the volume instead to provide smooth transition.
   */
  private setVolume(soundKey: string, volume: number): void {
    if (this.players.has(soundKey) === false) {
      return;
    }

    const player = this.players.get(soundKey);
    if (!player) {
      return;
    }

    if (player.playing()) {
      player.fade(player.volume(), volume, PlayerManager.DEFAULT_FADE_DURATION);
    } else {
      player.volume(volume);
    }
  }

  isBuffering(): boolean {
    return this.bufferingState.size > 0;
  }

  /**
   * Implements the callback to handle messages received from the Sender
   * application. Based on the action taken, it invokes the status callback with
   * an appropriate PlayerManagerStatusEvent.
   */
  handlePlayerEvent(event: PlayerControlEvent): void {
    event.src.forEach((soundKey: string) => {
      if (this.players.has(soundKey) === false) {
        if (event.action !== PlayerAction.Create) {
          // shouldn't be here?
          return;
        }

        if (this.players.size === 0) {
          this.stopIdleTimer();
        }

        this.players.set(
          soundKey,
          this.createPlayer(soundKey, event.isLooping, event.volume)
        );

        this.notifyStatusUpdate(PlayerManagerStatus.Playing);
        return;
      }

      this.setVolume(soundKey, event.volume);
      switch (event.action) {
        case PlayerAction.Play:
          this.play(soundKey, event.fadeInDuration);
          break;
        case PlayerAction.Pause:
          this.pause(soundKey);
          break;
        case PlayerAction.Stop:
          this.stop(soundKey);
          break;
      }

      if (this.players.size === 0) {
        this.notifyStatusUpdate(PlayerManagerStatus.Idle);
        this.startIdleTimer();
      } else {
        this.notifyStatusUpdate(PlayerManagerStatus.Playing);
      }
    });
  }

  /**
   * helper function to invoke the event receiver callback.
   */
  private notifyStatusUpdate(event: PlayerManagerStatus): void {
    if (this.onStatusUpdateCallback) {
      this.onStatusUpdateCallback(event);
    }
  }

  /**
   * Registers a callback to notify when status of the player manager changes.
   */
  onStatusUpdate(f: (event: PlayerManagerStatus) => void): void {
    this.onStatusUpdateCallback = f;
  }
}
