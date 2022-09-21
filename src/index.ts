import { Event } from "chromecast-caf-receiver/cast.framework.system";
import PlayerManager from "./player_manager";
import StatusUiManager from "./status_ui_manager";
import { PlayerManagerStatus } from "./types";

const NAMESPACE = "urn:x-cast:com.github.ashutoshgngwr.noice";

function main(): void {
  const opts = new cast.framework.CastReceiverOptions();

  // disable default idle timeout implementation (only works if
  // cast-media-player implementation is used.)
  opts.disableIdleTimeout = true;
  opts.customNamespaces = {};
  opts.customNamespaces[NAMESPACE] = cast.framework.system.MessageType.JSON;

  const ctx = cast.framework.CastReceiverContext.getInstance();
  const manager = new PlayerManager();
  const statusContainer = document.querySelector("#status") as HTMLDivElement;
  if (statusContainer == null) {
    throw new Error("failed to find the div element with id '#status'");
  }

  const uiManager = new StatusUiManager(statusContainer);
  manager.onStatusUpdate((event: PlayerManagerStatus) => {
    switch (event) {
      case PlayerManagerStatus.Idle:
        uiManager.enableIdleStatus();
        break;
      case PlayerManagerStatus.IdleTimedOut:
        ctx.stop();
        break;
      default:
        uiManager.enablePlayingStatus();
        break;
    }

    if (event === PlayerManagerStatus.Playing && manager.isBuffering()) {
      uiManager.enableLoaderStatus();
    } else {
      uiManager.disableLoaderStatus();
    }
  });

  ctx.addCustomMessageListener(NAMESPACE, (event: Event): void => {
    manager.handlePlayerEvent(event.data);
  });

  // In an ideal case, the playback should pause and resume when connection
  // suspends and resumes. Since communication between sender and receiver is
  // only one-way in our implementation, the state can only be maintained at
  // sender's side. Hence we need stop the receiver if the connection breaks.
  ctx.addEventListener(
    cast.framework.system.EventType.SENDER_DISCONNECTED,
    (): void => ctx.stop()
  );

  // show idle status by default
  uiManager.enableIdleStatus();
  ctx.start(opts);
}

window.addEventListener("load", main);
