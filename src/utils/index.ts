import dayjs from 'dayjs';

export const formatPrice = (price: number, currency: string = 'CNY'): string => {
  if (price === 0) return '免费';
  return `¥${price.toFixed(0)}`;
};

export const formatDate = (date: string, format: string = 'YYYY-MM-DD'): string => {
  return dayjs(date).format(format);
};

export const formatDateCN = (date: string): string => {
  return dayjs(date).format('MM月DD日');
};

export const getDayOfWeek = (date: string): string => {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return days[dayjs(date).day()];
};

export const generateTimeSlots = (): { startTime: string; endTime: string; period: 'morning' | 'afternoon' | 'evening' }[] => {
  return [
    { startTime: '09:00', endTime: '11:00', period: 'morning' },
    { startTime: '11:00', endTime: '13:00', period: 'morning' },
    { startTime: '13:00', endTime: '15:00', period: 'afternoon' },
    { startTime: '15:00', endTime: '17:00', period: 'afternoon' },
    { startTime: '17:00', endTime: '19:00', period: 'evening' },
    { startTime: '19:00', endTime: '21:00', period: 'evening' }
  ];
};

export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const generateShareContent = (tripName: string, days: any[]): string => {
  let content = `【${tripName}】行程规划\n\n`;
  days.forEach(day => {
    content += `${day.dateStr}\n`;
    if (day.timeSlots && day.timeSlots.length > 0) {
      day.timeSlots.forEach((slot: any) => {
        content += `  ${slot.startTime}-${slot.endTime} ${slot.attractionName}\n`;
      });
    }
    if (day.hotel) {
      content += `  🏨 ${day.hotel.name}\n`;
    }
    content += '\n';
  });
  return content;
};

export const getChecklistProgress = (items: { checked: boolean }[]): { checked: number; total: number; percent: number } => {
  const total = items.length;
  const checked = items.filter(i => i.checked).length;
  const percent = total > 0 ? Math.round((checked / total) * 100) : 0;
  return { checked, total, percent };
};

export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timer: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[Utils] 复制失败:', error);
    return false;
  }
};
