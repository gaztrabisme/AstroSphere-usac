// Điểm vào của phần câu chuyện (bản khung — luồng giao diện sẽ hoàn thiện).

import type { StoryHandle, StoryHost } from './types';

export function mountStory(_host: StoryHost): StoryHandle {
  return {
    maybeShowHero() {},
    showHero() {},
    open() {},
    isOpen: () => false,
    onKey: () => false,
  };
}
