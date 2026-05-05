
// Service to handle reliable time fetching from Internet (NTP-like behavior over HTTP)
// This prevents users from changing device time to backdate visits

let timeOffset = 0; // Difference between Server Time and Device Time in ms
let isSynced = false;

const TIME_API_URL = 'https://worldtimeapi.org/api/timezone/America/Sao_Paulo';

/**
 * Synchronizes the internal time offset with an Internet Time Server.
 * Calculates latency to approximate the actual time.
 */
export const syncTimeWithServer = async (): Promise<void> => {
  try {
    const startTick = Date.now();
    
    // Attempt to fetch time. Set a timeout to avoid hanging if internet is slow.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(TIME_API_URL, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error('Time API Error');

    const data = await response.json();
    const endTick = Date.now();

    // Calculate latency (round trip time / 2)
    const latency = (endTick - startTick) / 2;

    // Server time is the datetime returned + latency
    const serverTime = new Date(data.datetime).getTime() + latency;
    const deviceTime = Date.now();

    // Offset = Server Time - Device Time
    timeOffset = serverTime - deviceTime;
    isSynced = true;

    console.log(`[TimeService] Synced. Device lag: ${timeOffset}ms. Source: ${TIME_API_URL}`);

  } catch (error) {
    console.warn('[TimeService] Failed to sync with internet time. Falling back to system time.', error);
    // If failed, offset remains 0 (System Time)
    isSynced = false;
  }
};

/**
 * Returns the current Date object corrected by the internet offset.
 */
export const getTrustedDate = (): Date => {
  return new Date(Date.now() + timeOffset);
};

/**
 * Returns current timestamp in ISO format (safe for logs)
 */
export const getTrustedISOString = (): string => {
  return getTrustedDate().toISOString();
};

/**
 * Returns a unique key for the commercial cycle (Starts day 20)
 * Example: if date is 2024-05-20, cycle is 2024-06
 */
export const getCycleKey = (dateOverride?: Date): string => {
  const date = dateOverride || getTrustedDate();
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  
  // Cycle index calculation (Match logic in Dashboard.tsx)
  const cycleMonth = day >= 20 ? month + 2 : month + 1; // +1 to compensate 0-index, +1 if >= 20
  let finalYear = year;
  let finalMonth = cycleMonth;
  
  if (finalMonth > 12) {
    finalMonth -= 12;
    finalYear += 1;
  }
  
  return `${finalYear}-${finalMonth.toString().padStart(2, '0')}`;
};

/**
 * Returns a period identifier string based on the given frequency.
 * Examples: 'Mensal' -> '2024-05', 'Trimestral' -> '2024-Q2', 'Anual' -> '2024'
 */
export const getPeriodKey = (period: 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual', dateOverride?: Date): string => {
  const date = dateOverride || getTrustedDate();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  switch (period) {
    case 'Mensal':
      return `${year}-${month.toString().padStart(2, '0')}`;
    case 'Trimestral':
      const quarter = Math.ceil(month / 3);
      return `${year}-Q${quarter}`;
    case 'Semestral':
      const semester = month <= 6 ? 1 : 2;
      return `${year}-S${semester}`;
    case 'Anual':
      return `${year}`;
    default:
      return `${year}-${month.toString().padStart(2, '0')}`;
  }
};

/**
 * Returns local date string (e.g., "dd/mm/yyyy") based on trusted time
 */
export const getTrustedLocalDateString = (): string => {
  return getTrustedDate().toLocaleDateString('pt-BR');
};

/**
 * Check if time is currently synced with internet
 */
export const isTimeSynced = (): boolean => isSynced;