/**
 * Safe map utility functions to prevent undefined/null errors
 */

/**
 * Safely maps an array and accesses a property with optional chaining
 * @param array - The array to map
 * @param property - The property to access
 * @param defaultValue - Default value if property is undefined
 * @returns Array of property values
 */
export const safeMap = <T, K extends keyof T>(
  array: T[] | null | undefined,
  property: K,
  defaultValue: T[K] | null = null
): (T[K] | null)[] => {
  if (!Array.isArray(array)) return [];
  return array.map(item => 
    item && typeof item === 'object' && property in item 
      ? item[property] ?? defaultValue 
      : defaultValue
  );
};

/**
 * Safely maps an array with a callback function, filtering out invalid items
 * @param array - The array to map
 * @param callback - The mapping function
 * @returns Array of mapped values (null items filtered out)
 */
export const safeMapWithCallback = <T, R>(
  array: T[] | null | undefined,
  callback: (item: T, index: number) => R | null,
  filterNulls: boolean = true
): R[] => {
  if (!Array.isArray(array)) return [];
  const mapped = array.map(callback);
  return filterNulls ? mapped.filter((item): item is R => item !== null && item !== undefined) : mapped as R[];
};

/**
 * Safely maps an array and accesses nested property
 * @param array - The array to map
 * @param path - Dot-separated path to the property (e.g., 'props.type')
 * @param defaultValue - Default value if property is undefined
 * @returns Array of property values
 */
export const safeMapNested = <T>(
  array: T[] | null | undefined,
  path: string,
  defaultValue: any = null
): any[] => {
  if (!Array.isArray(array)) return [];
  return array.map(item => {
    if (!item || typeof item !== 'object') return defaultValue;
    const keys = path.split('.');
    let value: any = item;
    for (const key of keys) {
      if (value == null || typeof value !== 'object' || !(key in value)) {
        return defaultValue;
      }
      value = value[key];
    }
    return value ?? defaultValue;
  });
};

/**
 * Validates and filters an array before mapping
 * @param array - The array to validate
 * @param validator - Function to validate each item
 * @returns Filtered array
 */
export const validateArray = <T>(
  array: T[] | null | undefined,
  validator: (item: T) => boolean
): T[] => {
  if (!Array.isArray(array)) return [];
  return array.filter(validator);
};

/**
 * Debug helper to log array state before mapping
 */
export const debugArray = <T>(
  array: T[] | null | undefined,
  label: string = 'Array'
): void => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 DEBUG ${label}:`, {
      isArray: Array.isArray(array),
      length: array?.length ?? 0,
      hasUndefined: array?.some(item => item === undefined),
      hasNull: array?.some(item => item === null),
      sample: array?.slice(0, 3)
    });
  }
};

