/**
 * Icon definitions — all SVG icons for the WebOS platform.
 *
 * Icons are registered via `registerIcon` so they can be used as:
 *   <Icon name="search" />
 */

import { registerIcon } from './Icon';
import type { ComponentType, SVGProps } from 'react';

type Svg = ComponentType<SVGProps<SVGSVGElement> & { width?: number; height?: number }>;

// ---------------------------------------------------------------------------
// Arrow / Navigation
// ---------------------------------------------------------------------------

const ChevronUp: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 10L8 6L12 10" /></svg>;
registerIcon('chevron-up', ChevronUp);

const ChevronDown: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 6L8 10L12 6" /></svg>;
registerIcon('chevron-down', ChevronDown);

const ChevronLeft: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M10 12L6 8L10 4" /></svg>;
registerIcon('chevron-left', ChevronLeft);

const ChevronRight: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 4L10 8L6 12" /></svg>;
registerIcon('chevron-right', ChevronRight);

const ArrowUp: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M8 13V3M4 7L8 3L12 7" /></svg>;
registerIcon('arrow-up', ArrowUp);

const ArrowDown: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M8 3V13M4 9L8 13L12 9" /></svg>;
registerIcon('arrow-down', ArrowDown);

const ArrowLeft: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M13 8H3M7 4L3 8L7 12" /></svg>;
registerIcon('arrow-left', ArrowLeft);

const ArrowRight: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 8H13M9 4L13 8L9 12" /></svg>;
registerIcon('arrow-right', ArrowRight);

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

const Close: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 4L12 12M12 4L4 12" /></svg>;
registerIcon('xmark', Close);

const Plus: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M8 2V14M2 8H14" /></svg>;
registerIcon('plus', Plus);

const Minus: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 8H13" /></svg>;
registerIcon('minus', Minus);

const Check: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 8L6.5 11.5L13 4.5" /></svg>;
registerIcon('check', Check);

const Search: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></svg>;
registerIcon('search', Search);

const Refresh: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M13.5 8A5.5 5.5 0 1 1 8 2.5" /><path d="M13.5 2.5V8H8" /></svg>;
registerIcon('refresh', Refresh);

const Save: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12.5 14.5H3.5V1.5H10L12.5 4V14.5Z" /><path d="M10 1.5V4.5H12.5" /><rect x="5" y="8" width="6" height="4" rx="0.5" fill="currentColor" stroke="none" opacity="0.3" /></svg>;
registerIcon('save', Save);

const Edit: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M11.5 1.5L14.5 4.5L5.5 13.5H2.5V10.5L11.5 1.5Z" /><path d="M9.5 3.5L12.5 6.5" /></svg>;
registerIcon('edit', Edit);

const Copy: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="5" y="5" width="9" height="9" rx="1.5" /><path d="M3 11H2.5A1.5 1.5 0 0 1 1 9.5V2.5A1.5 1.5 0 0 1 2.5 1H9.5A1.5 1.5 0 0 1 11 2.5V3" /></svg>;
registerIcon('copy', Copy);

const Trash: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 4H13" /><path d="M5 4V2.5H11V4" /><path d="M4 4L4.5 13H11.5L12 4" /><path d="M6.5 6.5V11" /><path d="M9.5 6.5V11" /></svg>;
registerIcon('trash', Trash);

const Download: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M8 2V10" /><path d="M4.5 7.5L8 11L11.5 7.5" /><path d="M2 13H14" /></svg>;
registerIcon('download', Download);

const Upload: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M8 11V3" /><path d="M4.5 5.5L8 2L11.5 5.5" /><path d="M2 13H14" /></svg>;
registerIcon('upload', Upload);

const Send: Svg = (p) => <svg viewBox="0 0 16 16" fill="currentColor" stroke="none" {...p}><path d="M1 8L14.5 1L11 9.5L7 8.5L5.5 13L1 8Z" opacity="0.9" /></svg>;
registerIcon('send', Send);

const Filter: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M1.5 2H14.5L9 8.5V12.5L7 13.5V8.5L1.5 2Z" /></svg>;
registerIcon('filter', Filter);

const SortAsc: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2 4H14" /><path d="M5 8H14" /><path d="M8 12H14" /></svg>;
registerIcon('sort-asc', SortAsc);

const Star: Svg = (p) => <svg viewBox="0 0 16 16" fill="currentColor" stroke="none" {...p}><path d="M8 1L10.2 5.5L15 6.3L11.5 9.8L12.3 14.5L8 12.1L3.7 14.5L4.5 9.8L1 6.3L5.8 5.5L8 1Z" /></svg>;
registerIcon('star', Star);

const Pin: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M10 1V5L13 8L8 14L3 8L6 5V1H10Z" /><path d="M6 1H10" /></svg>;
registerIcon('pin', Pin);

const ExternalLink: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 2H2V14H14V10" /><path d="M10 2H14V6" /><path d="M14 2L8 8" /></svg>;
registerIcon('external-link', ExternalLink);

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

const Play: Svg = (p) => <svg viewBox="0 0 16 16" fill="currentColor" stroke="none" {...p}><polygon points="4,2 14,8 4,14" /></svg>;
registerIcon('play', Play);

const Pause: Svg = (p) => <svg viewBox="0 0 16 16" fill="currentColor" stroke="none" {...p}><rect x="3" y="2" width="3.5" height="12" rx="0.5" /><rect x="9.5" y="2" width="3.5" height="12" rx="0.5" /></svg>;
registerIcon('pause', Pause);

const SkipPrev: Svg = (p) => <svg viewBox="0 0 18 18" fill="currentColor" stroke="none" {...p}><polygon points="12,3 3,9 12,15" /><rect x="13" y="3" width="2" height="12" rx="0.5" /></svg>;
registerIcon('skip-prev', SkipPrev);

const SkipNext: Svg = (p) => <svg viewBox="0 0 18 18" fill="currentColor" stroke="none" {...p}><polygon points="6,3 15,9 6,15" /><rect x="3" y="3" width="2" height="12" rx="0.5" /></svg>;
registerIcon('skip-next', SkipNext);

const Volume: Svg = (p) => <svg viewBox="0 0 16 16" fill="currentColor" stroke="none" {...p}><path d="M2 5.5H4L8 2.5V13.5L4 10.5H2V5.5Z" /><path d="M10 5.5C11 6.5 11 9.5 10 10.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><path d="M12 3.5C14 5 14 11 12 12.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>;
registerIcon('volume', Volume);

const VolumeLow: Svg = (p) => <svg viewBox="0 0 16 16" fill="currentColor" stroke="none" {...p}><path d="M2 5.5H4L8 2.5V13.5L4 10.5H2V5.5Z" /><path d="M10 5.5C11 6.5 11 9.5 10 10.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>;
registerIcon('volume-low', VolumeLow);

const VolumeMute: Svg = (p) => <svg viewBox="0 0 16 16" fill="currentColor" stroke="none" {...p}><path d="M2 5.5H4L8 2.5V13.5L4 10.5H2V5.5Z" /><path d="M11 5.5L14 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" /><path d="M14 5.5L11 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" /></svg>;
registerIcon('volume-mute', VolumeMute);

const Shuffle: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2 5L5 5L8 11L11 11L14 11" /><path d="M2 11L5 11L8 5L11 5L14 5" /><path d="M12 3L14 5L12 7" /><path d="M12 9L14 11L12 13" /></svg>;
registerIcon('shuffle', Shuffle);

const Repeat: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2 6H12V12" /><path d="M10 4L12 6L10 8" /></svg>;
registerIcon('repeat', Repeat);

const RepeatOne: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2 6H12V12" /><path d="M10 4L12 6L10 8" /><text x="6" y="11.5" fontSize="7" fill="currentColor" stroke="none" textAnchor="middle" fontFamily="sans-serif">1</text></svg>;
registerIcon('repeat-one', RepeatOne);

// ---------------------------------------------------------------------------
// Image / Zoom
// ---------------------------------------------------------------------------

const ZoomIn: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /><path d="M5 7H9" /><path d="M7 5V9" /></svg>;
registerIcon('zoom-in', ZoomIn);

const ZoomOut: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /><path d="M5 7H9" /></svg>;
registerIcon('zoom-out', ZoomOut);

const ZoomFit: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2 6V2H6" /><path d="M10 2H14V6" /><path d="M14 10V14H10" /><path d="M6 14H2V10" /><rect x="5" y="5" width="6" height="6" rx="1" /></svg>;
registerIcon('zoom-fit', ZoomFit);

const RotateCW: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M13.5 8A5.5 5.5 0 1 1 8 2.5" /><path d="M10 2.5H13.5V6" /></svg>;
registerIcon('rotate-cw', RotateCW);

const RotateCCW: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2.5 8A5.5 5.5 0 1 1 8 13.5" /><path d="M6 13.5H2.5V10" /></svg>;
registerIcon('rotate-ccw', RotateCCW);

const FlipH: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M8 2V14" strokeDasharray="2 2" /><path d="M4 5L2 8L4 11" /><path d="M12 5L14 8L12 11" /></svg>;
registerIcon('flip-h', FlipH);

const FlipV: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2 8H14" strokeDasharray="2 2" /><path d="M5 4L8 2L11 4" /><path d="M5 12L8 14L11 12" /></svg>;
registerIcon('flip-v', FlipV);

const Image: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2" y="2" width="12" height="12" rx="2" /><circle cx="5.5" cy="5.5" r="1.5" /><path d="M14 11L10 7L2 14" /></svg>;
registerIcon('image', Image);

const Gallery: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="1" y="1" width="6" height="6" rx="1" /><rect x="9" y="1" width="6" height="6" rx="1" /><rect x="1" y="9" width="6" height="6" rx="1" /><rect x="9" y="9" width="6" height="6" rx="1" /></svg>;
registerIcon('gallery', Gallery);

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

const Folder: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M1.5 3.5H6.5L8 5H14.5V12.5H1.5V3.5Z" /></svg>;
registerIcon('folder', Folder);

const FolderOpen: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M1.5 3.5H6.5L8 5H14.5V7H2L1.5 14.5H14.5V7" /></svg>;
registerIcon('folder-open', FolderOpen);

const File: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 1.5H10.5L13.5 4.5V13.5H4V1.5Z" /><path d="M10.5 1.5V4.5H13.5" /></svg>;
registerIcon('file', File);

const FileCode: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 1.5H10.5L13.5 4.5V13.5H4V1.5Z" /><path d="M10.5 1.5V4.5H13.5" /><path d="M6.5 8L5.5 9.5L6.5 11" /><path d="M9.5 8L10.5 9.5L9.5 11" /></svg>;
registerIcon('file-code', FileCode);

const FileText: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 1.5H10.5L13.5 4.5V13.5H4V1.5Z" /><path d="M10.5 1.5V4.5H13.5" /><path d="M6 8H10" /><path d="M6 10H9" /></svg>;
registerIcon('file-text', FileText);

// ---------------------------------------------------------------------------
// Window / Shell
// ---------------------------------------------------------------------------

const Home: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2 8L8 2L14 8" /><path d="M3 7V13.5H6.5V9.5H9.5V13.5H13V7" /></svg>;
registerIcon('home', Home);

const Settings: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="8" cy="8" r="2.5" /><path d="M8 1V3M8 13V15M1 8H3M13 8H15M3 3L4.5 4.5M11.5 11.5L13 13M13 3L11.5 4.5M4.5 11.5L3 13" /></svg>;
registerIcon('settings', Settings);

const Maximize: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 3H13V13H3V3Z" /></svg>;
registerIcon('maximize', Maximize);

const Minimize: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 8H13" /></svg>;
registerIcon('minimize', Minimize);

const Bookmark: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 2H13V14L8 11L3 14V2Z" /></svg>;
registerIcon('bookmark', Bookmark);

const BookmarkFilled: Svg = (p) => <svg viewBox="0 0 16 16" fill="currentColor" stroke="currentColor" strokeWidth="1" {...p}><path d="M3 2H13V14L8 11L3 14V2Z" /></svg>;
registerIcon('bookmark-filled', BookmarkFilled);

const Clock: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="8" cy="8" r="6" /><path d="M8 5V8L10.5 9.5" /></svg>;
registerIcon('clock', Clock);

const History: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="8" cy="8" r="6" /><path d="M8 5V8L10.5 9.5" /></svg>;
registerIcon('history', History);

const Menu: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2 4H14" /><path d="M2 8H14" /><path d="M2 12H14" /></svg>;
registerIcon('menu', Menu);

const MoreHorizontal: Svg = (p) => <svg viewBox="0 0 16 16" fill="currentColor" stroke="none" {...p}><circle cx="3" cy="8" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="13" cy="8" r="1.5" /></svg>;
registerIcon('more-horizontal', MoreHorizontal);

// ---------------------------------------------------------------------------
// Text formatting
// ---------------------------------------------------------------------------

const Bold: Svg = (p) => <svg viewBox="0 0 16 16" fill="currentColor" stroke="none" {...p}><path d="M4 2H9C10.7 2 12 3.3 12 5C12 6.3 11 7.3 9.5 7.7L12 14H10L7.8 8H6V14H4V2ZM6 6H9C9.6 6 10 5.6 10 5C10 4.4 9.6 4 9 4H6V6Z" /></svg>;
registerIcon('bold', Bold);

const Italic: Svg = (p) => <svg viewBox="0 0 16 16" fill="currentColor" stroke="none" {...p}><path d="M6 2H11V3.5H8.5L5.5 12.5H9V14H4V12.5H6.5L9.5 3.5H6V2Z" /></svg>;
registerIcon('italic', Italic);

const Strikethrough: Svg = (p) => <svg viewBox="0 0 16 16" fill="currentColor" stroke="none" {...p}><path d="M4 2H12V3.5H8.5L7.5 6.5H12V8H7L6 12.5H12V14H4V12.5H8L9 8H4V6.5H9.5L10.5 3.5H4V2Z" /></svg>;
registerIcon('strikethrough', Strikethrough);

const Heading1: Svg = (p) => <svg viewBox="0 0 16 16" fill="currentColor" stroke="none" {...p}><text x="2" y="13" fontSize="12" fontWeight="bold" fontFamily="sans-serif">H1</text></svg>;
registerIcon('heading-1', Heading1);

const Heading2: Svg = (p) => <svg viewBox="0 0 16 16" fill="currentColor" stroke="none" {...p}><text x="2" y="13" fontSize="12" fontWeight="bold" fontFamily="sans-serif">H2</text></svg>;
registerIcon('heading-2', Heading2);

const Heading3: Svg = (p) => <svg viewBox="0 0 16 16" fill="currentColor" stroke="none" {...p}><text x="2" y="13" fontSize="12" fontWeight="bold" fontFamily="sans-serif">H3</text></svg>;
registerIcon('heading-3', Heading3);

const List: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 4H13" /><path d="M5 8H13" /><path d="M5 12H13" /><circle cx="2.5" cy="4" r="1" fill="currentColor" /><circle cx="2.5" cy="8" r="1" fill="currentColor" /><circle cx="2.5" cy="12" r="1" fill="currentColor" /></svg>;
registerIcon('list', List);

const OrderedList: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 4H13" /><path d="M5 8H13" /><path d="M5 12H13" /><text x="1" y="5.5" fontSize="5" fill="currentColor" stroke="none" fontFamily="sans-serif">1</text><text x="1" y="9.5" fontSize="5" fill="currentColor" stroke="none" fontFamily="sans-serif">2</text><text x="1" y="13.5" fontSize="5" fill="currentColor" stroke="none" fontFamily="sans-serif">3</text></svg>;
registerIcon('ordered-list', OrderedList);

const Code: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5.5 4L2.5 8L5.5 12" /><path d="M10.5 4L13.5 8L10.5 12" /></svg>;
registerIcon('code', Code);

const Link: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M7 9L4 12C3.2 12.8 1.5 12.5 1.5 11C1.5 9.5 3.2 9.2 4 10" /><path d="M9 7L12 4C12.8 3.2 14.5 3.5 14.5 5C14.5 6.5 12.8 6.8 12 6" /></svg>;
registerIcon('link', Link);

// ---------------------------------------------------------------------------
// Status / Misc
// ---------------------------------------------------------------------------

const Info: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="8" cy="8" r="6" /><path d="M8 7V11" /><circle cx="8" cy="5" r="0.5" fill="currentColor" /></svg>;
registerIcon('info', Info);

const Warning: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M8 1.5L14.5 13.5H1.5L8 1.5Z" /><path d="M8 6V9" /><circle cx="8" cy="11" r="0.5" fill="currentColor" /></svg>;
registerIcon('warning', Warning);

const Error: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="8" cy="8" r="6" /><path d="M8 5V9" /><circle cx="8" cy="11" r="0.5" fill="currentColor" /></svg>;
registerIcon('error', Error);

const Success: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="8" cy="8" r="6" /><path d="M5 8L7 10L11 6" /></svg>;
registerIcon('success', Success);

const Eye: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M1.5 8S4 3 8 3S14.5 8 14.5 8 12 13 8 13 1.5 8 1.5 8Z" /><circle cx="8" cy="8" r="2.5" /></svg>;
registerIcon('eye', Eye);

const EyeOff: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M1.5 8S4 3 8 3S14.5 8 14.5 8 12 13 8 13 1.5 8 1.5 8Z" /><circle cx="8" cy="8" r="2.5" /><path d="M3 3L13 13" /></svg>;
registerIcon('eye-off', EyeOff);

const Terminal: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2" y="3" width="12" height="10" rx="1.5" /><path d="M5 6.5L7.5 8L5 9.5" /><path d="M9 9.5H11" /></svg>;
registerIcon('terminal', Terminal);

const Music: Svg = (p) => <svg viewBox="0 0 16 16" fill="currentColor" stroke="none" {...p}><circle cx="4" cy="11" r="2" /><path d="M6 11V3L13 1.5V9" stroke="currentColor" strokeWidth="1" fill="none" /><circle cx="13" cy="9" r="2" /></svg>;
registerIcon('music', Music);

const Video: Svg = (p) => <svg viewBox="0 0 16 16" fill="currentColor" stroke="none" {...p}><rect x="1" y="3" width="9" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" /><polygon points="10.5,5.5 14,8 10.5,10.5" /></svg>;
registerIcon('video', Video);

const Calendar: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2" y="3" width="12" height="11" rx="1.5" /><path d="M2 7H14" /><path d="M5.5 1V4" /><path d="M10.5 1V4" /></svg>;
registerIcon('calendar', Calendar);

const Mail: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2" y="3" width="12" height="10" rx="1.5" /><path d="M2 5L8 9L14 5" /></svg>;
registerIcon('mail', Mail);

const Sun: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="8" cy="8" r="3" /><path d="M8 1V3M8 13V15M1 8H3M13 8H15M3.3 3.3L4.7 4.7M11.3 11.3L12.7 12.7M3.3 12.7L4.7 11.3M11.3 4.7L12.7 3.3" /></svg>;
registerIcon('sun', Sun);

const Moon: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M13.5 10.5A6 6 0 1 1 5.5 2.5 4.5 4.5 0 0 0 13.5 10.5Z" /></svg>;
registerIcon('moon', Moon);

const Palette: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="8" cy="8" r="6" /><circle cx="6" cy="6" r="1" fill="currentColor" /><circle cx="10" cy="6" r="1" fill="currentColor" /><circle cx="5" cy="9" r="1" fill="currentColor" /><circle cx="8" cy="11" r="1" fill="currentColor" /></svg>;
registerIcon('palette', Palette);

const Monitor: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2" y="2" width="12" height="8" rx="1.5" /><path d="M5 14H11" /><path d="M8 10V12" /></svg>;
registerIcon('monitor', Monitor);

const Wifi: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2 6C4.5 3.5 7 2 8 2S11.5 3.5 14 6" /><path d="M4 9C5.5 7 7 6 8 6S10.5 7 12 9" /><circle cx="8" cy="12" r="1" fill="currentColor" /></svg>;
registerIcon('wifi', Wifi);

const Lock: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3.5" y="7" width="9" height="7" rx="1.5" /><path d="M5 7V5A3 3 0 0 1 11 5V7" /><circle cx="8" cy="10.5" r="1" fill="currentColor" /></svg>;
registerIcon('lock', Lock);

const Unlock: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3.5" y="7" width="9" height="7" rx="1.5" /><path d="M5 7V5A3 3 0 0 1 11 5V7" /><circle cx="8" cy="10.5" r="1" fill="currentColor" /><path d="M10.5 7V5" /></svg>;
registerIcon('unlock', Unlock);

const GitBranch: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="4" cy="4" r="1.5" fill="currentColor" /><circle cx="4" cy="12" r="1.5" fill="currentColor" /><circle cx="12" cy="8" r="1.5" fill="currentColor" /><path d="M4 5.5V10.5" /><path d="M4 8C4 8 7 8 10.5 8" /></svg>;
registerIcon('git-branch', GitBranch);

const Commit: Svg = (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="8" cy="4" r="1.5" fill="currentColor" /><circle cx="8" cy="12" r="1.5" fill="currentColor" /><path d="M8 5.5V10.5" /></svg>;
registerIcon('commit', Commit);

const Visualizer: Svg = (p) => <svg viewBox="0 0 16 16" fill="currentColor" stroke="none" {...p}><rect x="1" y="8" width="2" height="6" rx="0.5" /><rect x="4.5" y="5" width="2" height="9" rx="0.5" /><rect x="8" y="3" width="2" height="11" rx="0.5" /><rect x="11.5" y="6" width="2" height="8" rx="0.5" /></svg>;
registerIcon('visualizer', Visualizer);
