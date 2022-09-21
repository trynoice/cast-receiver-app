import StatusUiManager from "./status_ui_manager";

describe("StatusUiManager", () => {
  let container: HTMLDivElement;
  let manager: StatusUiManager;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    manager = new StatusUiManager(container);
  });

  it("should toggle between idle and playing status", () => {
    manager.enableIdleStatus();
    expect(container.querySelector("#idle")).toBeVisible();
    expect(container.querySelector("#playing")).not.toBeVisible();
    manager.enablePlayingStatus();
    expect(container.querySelector("#idle")).not.toBeVisible();
    expect(container.querySelector("#playing")).toBeVisible();
  });

  it("should enable/disable loader status", () => {
    manager.enableLoaderStatus();
    expect(container.querySelector("#loader")).toBeVisible();
    manager.disableLoaderStatus();
    expect(container.querySelector("#loader")).not.toBeVisible();
  });
});
