// Bảng 2: Hoạt ảnh (chạy/tạm dừng, chế độ, tốc độ, giờ thiên văn).

import { fmtHMS, fmtNum, SIDEREAL_DAY_SECONDS } from '../astro';
import { t } from '../i18n';
import { lstCont, lstOf, RATE_MAX, RATE_MIN, type Actions, type AnimMode, type Store } from '../state';
import { button, h } from './dom';

export function animationPanel(store: Store, actions: Actions): HTMLElement {
  const playBtn = h('button', { type: 'button', class: 'btn btn--primary btn--play', 'aria-pressed': 'false', onclick: () => actions.togglePlay() });

  const mode = h(
    'select',
    { id: 'anim-mode', onchange: (e: Event) => actions.setMode((e.target as HTMLSelectElement).value as AnimMode) },
    h('option', { value: 'continuous', text: t('panel.animation.modeContinuous') }),
    h('option', { value: 'oneDay', text: t('panel.animation.modeOneDay') }),
    h('option', { value: 'stepHour', text: t('panel.animation.modeStep') }),
  );

  const rateOut = h('output', { class: 'value', htmlFor: 'rate' });
  const rateNote = h('p', { class: 'hint' });
  const rate = h('input', {
    type: 'range',
    id: 'rate',
    class: 'range',
    min: RATE_MIN,
    max: RATE_MAX,
    step: 1,
    oninput: (e: Event) => actions.setRate(RATE_MAX + RATE_MIN - Number((e.target as HTMLInputElement).value)),
    'aria-label': t('panel.animation.speedAria'),
  });

  const lstOut = h('output', { class: 'value value--big', htmlFor: 'lst' });
  const lst = h('input', {
    type: 'range',
    id: 'lst',
    class: 'range range--lst',
    min: 0,
    max: 1440,
    step: 1,
    oninput: (e: Event) => {
      actions.pause();
      actions.setLst((Number((e.target as HTMLInputElement).value) / 60) * 15);
    },
    'aria-label': t('panel.animation.lstAria'),
  });
  const ticks = h('div', { class: 'ticks', 'aria-hidden': 'true' }, ...[0, 6, 12, 18, 24].map((x) => h('span', { text: `${x}h` })));
  const progress = h('p', { class: 'hint progress' });

  const el = h(
    'section',
    { class: 'panel', id: 'panel-animation', 'aria-labelledby': 'h-anim' },
    h('h2', { id: 'h-anim', class: 'panel__title', text: t('panel.animation.title') }),
    h('div', { class: 'row' }, playBtn, h('label', { class: 'sr-only', htmlFor: 'anim-mode', text: t('panel.animation.mode') }), mode),
    progress,
    h('div', { class: 'field' }, h('div', { class: 'field__head' }, h('label', { htmlFor: 'lst', text: t('panel.animation.lst') }), lstOut), lst, ticks),
    h(
      'div',
      { class: 'row row--wrap' },
      button(t('panel.animation.stepBack'), () => actions.stepHours(-1), { title: t('panel.animation.stepBackTip') }),
      button(t('panel.animation.stepForward'), () => actions.stepHours(1), { title: t('panel.animation.stepForwardTip') }),
      button(t('panel.animation.now'), () => actions.setNow(), { title: t('panel.animation.nowTip') }),
    ),
    h('div', { class: 'field' }, h('div', { class: 'field__head' }, h('label', { htmlFor: 'rate', text: t('panel.animation.speed') }), rateOut), rate, h('div', { class: 'ticks', 'aria-hidden': 'true' }, h('span', { text: t('panel.animation.slow') }), h('span', { text: t('panel.animation.fast') }))),
    rateNote,
    h('p', { class: 'note', text: t('panel.animation.siderealNote') }),
  );

  const sync = () => {
    const s = store.state;
    playBtn.textContent = s.playing ? t('panel.animation.pause') : t('panel.animation.play');
    playBtn.setAttribute('aria-pressed', String(s.playing));
    mode.value = s.mode;
    rate.value = String(RATE_MAX + RATE_MIN - s.rate);
    rateOut.textContent = t('panel.animation.speedValue', { s: s.rate });
    rateNote.textContent = t('panel.animation.speedNote', { x: fmtNum(SIDEREAL_DAY_SECONDS / s.rate, 0) });
    const l = lstOf(s);
    lstOut.textContent = fmtHMS(l);
    if (document.activeElement !== lst || !s.playing) lst.value = String(Math.round((l / 15) * 60) % 1440);
    lst.setAttribute('aria-valuetext', fmtHMS(l));
    if (s.mode === 'oneDay') {
      const done = Math.min(1, Math.max(0, (lstCont(s) - s.runStartLst) / 360));
      progress.textContent = t('panel.animation.oneDayProgress', { p: fmtNum(done * 100, 0) });
    } else progress.textContent = '';
  };
  store.subscribe(sync);
  sync();
  return el;
}
