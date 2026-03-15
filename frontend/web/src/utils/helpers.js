import { formatDistanceToNow, format, isToday, isYesterday, isThisYear } from 'date-fns';

export function formatMessageTime(date) {
  return format(new Date(date), 'HH:mm');
}

export function formatChatTime(date) {
  const d = new Date(date);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Yesterday';
  if (isThisYear(d)) return format(d, 'd MMM');
  return format(d, 'd/M/yy');
}

export function formatLastSeen(date) {
  if (!date) return '';
  return `last seen ${formatDistanceToNow(new Date(date), { addSuffix: true })}`;
}

export function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(' ').slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

export function isImageType(mimeType) {
  return mimeType?.startsWith('image/');
}

export function isVideoType(mimeType) {
  return mimeType?.startsWith('video/');
}

export function isAudioType(mimeType) {
  return mimeType?.startsWith('audio/');
}

export function groupMessagesByDate(messages) {
  const groups = [];
  let currentDate = null;
  messages?.forEach(msg => {
    const d = format(new Date(msg.createdAt), 'yyyy-MM-dd');
    if (d !== currentDate) {
      currentDate = d;
      groups.push({ type: 'date', label: formatDateSeparator(msg.createdAt), key: d });
    }
    groups.push({ type: 'message', message: msg, key: msg.id });
  });
  return groups;
}

function formatDateSeparator(date) {
  const d = new Date(date);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  if (isThisYear(d)) return format(d, 'MMMM d');
  return format(d, 'MMMM d, yyyy');
}

export function clsx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(() => {});
}
