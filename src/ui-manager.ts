import { getSound } from './api/cdn';
import HourglassIcon from './assets/hourglass.svg';
import VolumeUpIcon from './assets/volume-up.svg';

export default class UiManager {
  public setEnabled(enabled: boolean) {
    setVisibility(
      requireElement(document, 'body'),
      enabled ? 'visible' : 'hidden'
    );
  }

  public setPresetName(name?: string | null) {
    name = name ?? 'Unsaved Preset';
    requireElement(document, '#preset > .name').innerHTML = name;
  }

  public setState(
    state: 'loading' | 'playing' | 'pausing' | 'paused' | 'stopping' | 'stopped'
  ) {
    setVisibility(
      requireElement(document, '#preset'),
      state === 'loading' || state === 'stopped' ? 'hidden' : 'visible'
    );

    setVisibility(
      requireElement(document, '#volume'),
      state === 'loading' ? 'hidden' : 'visible'
    );

    setVisibility(
      requireElement(document, '#active-sounds'),
      state === 'loading' ? 'hidden' : 'visible'
    );

    document
      .querySelectorAll<HTMLElement>(`#state > li`)
      .forEach((e) => setVisibility(e, 'hidden'));

    setVisibility(requireElement(document, `#state > #${state}`), 'visible');
  }

  public setVolume(volume: number) {
    const p = Math.round(volume * 100);
    requireElement(document, '#volume > .percentage').innerHTML = `${p}%`;
  }

  public setSoundState(
    soundId: string,
    state: 'playing' | 'buffering' | 'stopped',
    volume: number
  ) {
    if (state === 'stopped') {
      document.querySelector(`#active-sounds > #${soundId}`)?.remove();
      return;
    }

    if (document.querySelector(`#active-sounds > #${soundId}`) == null) {
      const t = document.createElement('template');
      t.innerHTML = `
      <li id="${soundId}">
        <span class="name"></span>
        <img class="loader" src="${HourglassIcon}" style="display: none" />
        <img class="volume-icon" src="${VolumeUpIcon}" />
        <span class="volume"></span>
      </li>
    `.trim();

      if (t.content.firstChild == null) {
        throw new Error('first child of this template must not be null');
      }

      requireElement(document, '#active-sounds').appendChild(
        t.content.firstChild
      );

      getSound(soundId).then((sound) => {
        const e = document.querySelector<HTMLElement>(
          `#active-sounds > #${soundId} > .name`
        );

        if (e != null && sound != null) {
          e.innerHTML = sound.name;
        }
      });
    }

    setVisibility(
      requireElement(document, `#active-sounds > #${soundId} > .loader`),
      state === 'buffering' ? 'visible' : 'hidden'
    );

    requireElement(
      document,
      `#active-sounds > #${soundId} > .volume`
    ).innerHTML = `${Math.round(volume * 100)}%`;
  }
}

function requireElement<Type extends Element>(
  root: ParentNode,
  query: string
): Type {
  const e = root.querySelector<Type>(query);
  if (e == null) {
    throw new Error(`required element was null for selector '${query}`);
  }

  return e;
}

function setVisibility(element: HTMLElement, visibility: 'visible' | 'hidden') {
  if (visibility === 'hidden') {
    element.style.display = 'none';
  } else {
    element.style.display = '';
  }
}
