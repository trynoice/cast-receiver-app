import { getSound } from './api/cdn';
import HourglassIcon from 'data-url:./assets/hourglass.svg';
import VolumeUpIcon from 'data-url:./assets/volume-up.svg';

export default class UiManager {
  public setEnabled(enabled: boolean) {
    setVisibility(requireElement('body'), enabled ? 'visible' : 'hidden');
  }

  public setPresetName(name?: string | null) {
    name = name ?? 'Unsaved Preset';
    requireElement('#preset > .name').innerHTML = name;
  }

  public setState(
    state: 'loading' | 'playing' | 'pausing' | 'paused' | 'stopping' | 'stopped'
  ) {
    setVisibility(
      requireElement('#preset'),
      state === 'loading' || state === 'stopped' ? 'hidden' : 'visible'
    );

    setVisibility(
      requireElement('#volume'),
      state === 'loading' ? 'hidden' : 'visible'
    );

    setVisibility(
      requireElement('#active-sounds'),
      state === 'loading' ? 'hidden' : 'visible'
    );

    document
      .querySelectorAll<HTMLElement>(`#state > li`)
      .forEach((e) => setVisibility(e, 'hidden'));

    setVisibility(requireElement(`#state > #${state}`), 'visible');
  }

  public setVolume(volume: number) {
    const p = Math.round(volume * 100);
    requireElement('#volume > .percentage').innerHTML = `${p}%`;
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

      requireElement('#active-sounds').appendChild(t.content.firstChild);
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
      requireElement(`#active-sounds > #${soundId} > .loader`),
      state === 'buffering' ? 'visible' : 'hidden'
    );

    requireElement(
      `#active-sounds > #${soundId} > .volume`
    ).innerHTML = `${Math.round(volume * 100)}%`;
  }
}

function requireElement<Type extends Element>(query: string): Type {
  const e = document.querySelector<Type>(query);
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
