import { Icons } from "./library";

/**
 * StatusUIHandler is responsible for managing status UI of the application.
 * It manages the div container passed via the constructor argument.
 */
export default class StatusUiManager {
  private idleStatus: HTMLElement;
  private playingStatus: HTMLElement;
  private loaderStatus: HTMLElement;

  constructor(statusContainer: HTMLDivElement) {
    this.idleStatus = this.createStatusElement("idle", "cast", "Ready to cast");
    this.loaderStatus = this.createStatusElement("loader", "loader", "");
    this.playingStatus = this.createStatusElement(
      "playing",
      "playing",
      "A device is casting"
    );

    statusContainer.append(
      this.idleStatus,
      this.playingStatus,
      this.loaderStatus
    );
  }

  private createIcon(id: string): HTMLElement {
    const template = document.createElement("template");
    template.innerHTML = `<svg id="${id}" class="icon"><use xlink:href="${Icons[id]}" /><svg>`;
    return template.content.firstChild as HTMLElement;
  }

  private createStatusElement(
    id: string,
    iconID: string,
    message: string
  ): HTMLElement {
    const element = document.createElement("div");
    element.id = id;
    element.classList.add("statusline", "caption");
    element.style.display = "none";
    element.appendChild(this.createIcon(iconID));
    element.appendChild(document.createTextNode(message));
    return element;
  }

  public enableIdleStatus(): void {
    this.playingStatus.style.display = "none";
    this.idleStatus.style.removeProperty("display");
  }

  public enablePlayingStatus(): void {
    this.idleStatus.style.display = "none";
    this.playingStatus.style.removeProperty("display");
  }

  public enableLoaderStatus(): void {
    this.loaderStatus.style.removeProperty("display");
  }

  public disableLoaderStatus(): void {
    this.loaderStatus.style.display = "none";
  }
}
