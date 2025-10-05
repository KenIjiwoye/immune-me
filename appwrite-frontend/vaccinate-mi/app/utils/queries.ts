/**
 * Appwrite Query Building Utilities
 * Comprehensive utilities for building and managing Appwrite Query objects
 */

import { Query } from 'react-native-appwrite';

// =============================================================================
// TYPES
// =============================================================================

export interface QueryFilter {
  field: string;
  operator: 'equal' | 'notEqual' | 'lessThan' | 'greaterThan' | 'lessThanEqual' | 'greaterThanEqual' | 'search' | 'between' | 'isNull' | 'isNotNull' | 'startsWith' | 'endsWith' | 'contains' | 'notContains';
  value?: any;
  values?: any[]; // For between operator
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderType?: 'ASC' | 'DESC';
  filters?: QueryFilter[];
  search?: {
    field: string;
    value: string;
  };
  dateRange?: {
    field: string;
    start?: Date | string;
    end?: Date | string;
  };
  geoLocation?: {
    field: string;
    lat: number;
    lng: number;
    radius?: number; // in kilometers
  };
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// =============================================================================
// CORE QUERY BUILDER
// =============================================================================

/**
 * Enhanced createQuery function for building Appwrite Query objects
 * Supports comprehensive query building with filters, pagination, sorting, etc.
 */
export function createQuery(options: QueryOptions): string[] {
  const queries: string[] = [];

  // Add filters
  if (options.filters && options.filters.length > 0) {
    const filterQueries = buildFilterQueries(options.filters);
    queries.push(...filterQueries);
  }

  // Add search
  if (options.search) {
    queries.push(buildSearchQuery(options.search.field, options.search.value));
  }

  // Add date range
  if (options.dateRange) {
    const dateQueries = buildDateRangeQuery(options.dateRange.field, options.dateRange.start, options.dateRange.end);
    queries.push(...dateQueries);
  }

  // Add geolocation
  if (options.geoLocation) {
    const geoQueries = buildGeoLocationQuery(options.geoLocation.field, options.geoLocation.lat, options.geoLocation.lng, options.geoLocation.radius);
    queries.push(...geoQueries);
  }

  // Add sorting
  if (options.orderBy) {
    queries.push(buildOrderBy(options.orderBy, options.orderType));
  }

  // Add pagination
  if (options.limit || options.offset) {
    const paginationQueries = buildPaginationQueries(options.limit, options.offset);
    queries.push(...paginationQueries);
  }

  return queries;
}

// =============================================================================
// PAGINATION HELPERS
// =============================================================================

/**
 * Build pagination queries (limit and offset)
 */
export function buildPaginationQueries(limit?: number, offset?: number): string[] {
  const queries: string[] = [];

  if (limit && limit > 0) {
    queries.push(Query.limit(limit));
  }

  if (offset && offset >= 0) {
    queries.push(Query.offset(offset));
  }

  return queries;
}

/**
 * Calculate pagination information
 */
export function getPaginationInfo(
  totalItems: number,
  currentPage: number,
  itemsPerPage: number
): PaginationInfo {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };
}

// =============================================================================
// SEARCH AND FILTER UTILITIES
// =============================================================================

/**
 * Build search query
 */
export function buildSearchQuery(field: string, value: string): string {
  if (!field || !value) {
    throw new Error('Field and value are required for search query');
  }
  return Query.search(field, value);
}

/**
 * Build filter queries from array of filters
 */
export function buildFilterQueries(filters: QueryFilter[]): string[] {
  return filters.map(filter => {
    switch (filter.operator) {
      case 'equal':
        return Query.equal(filter.field, filter.value);
      case 'notEqual':
        return Query.notEqual(filter.field, filter.value);
      case 'lessThan':
        return Query.lessThan(filter.field, filter.value);
      case 'greaterThan':
        return Query.greaterThan(filter.field, filter.value);
      case 'lessThanEqual':
        return Query.lessThanEqual(filter.field, filter.value);
      case 'greaterThanEqual':
        return Query.greaterThanEqual(filter.field, filter.value);
      case 'search':
        return Query.search(filter.field, filter.value);
      case 'between':
        if (!filter.values || filter.values.length !== 2) {
          throw new Error('Between operator requires exactly 2 values');
        }
        return Query.between(filter.field, filter.values[0], filter.values[1]);
      case 'isNull':
        return Query.isNull(filter.field);
      case 'isNotNull':
        return Query.isNotNull(filter.field);
      case 'startsWith':
        return Query.startsWith(filter.field, filter.value);
      case 'endsWith':
        return Query.endsWith(filter.field, filter.value);
      case 'contains':
        // Note: Appwrite doesn't have a direct contains, use search or custom logic
        return Query.search(filter.field, filter.value);
      case 'notContains':
        // This might need custom implementation or multiple queries
        throw new Error('notContains operator not directly supported by Appwrite');
      default:
        throw new Error(`Unsupported operator: ${filter.operator}`);
    }
  });
}

// =============================================================================
// SORTING AND ORDERING HELPERS
// =============================================================================

/**
 * Build sort query (alias for buildOrderBy)
 */
export function buildSortQuery(field: string, orderType: 'ASC' | 'DESC' = 'ASC'): string {
  return buildOrderBy(field, orderType);
}

/**
 * Build order by query
 */
export function buildOrderBy(field: string, orderType: 'ASC' | 'DESC' = 'ASC'): string {
  if (!field) {
    throw new Error('Field is required for order by query');
  }

  if (orderType === 'ASC') {
    return Query.orderAsc(field);
  } else {
    return Query.orderDesc(field);
  }
}

// =============================================================================
// DATE RANGE QUERIES
// =============================================================================

/**
 * Build date range queries
 */
export function buildDateRangeQuery(
  field: string,
  start?: Date | string,
  end?: Date | string
): string[] {
  const queries: string[] = [];

  if (!field) {
    throw new Error('Field is required for date range query');
  }

  if (start) {
    const startDate = start instanceof Date ? start.toISOString() : start;
    queries.push(Query.greaterThanEqual(field, startDate));
  }

  if (end) {
    const endDate = end instanceof Date ? end.toISOString() : end;
    queries.push(Query.lessThanEqual(field, endDate));
  }

  return queries;
}

// =============================================================================
// GEOLOCATION QUERIES
// =============================================================================

/**
 * Build geolocation queries
 * Note: Appwrite supports geo queries through latitude/longitude fields
 */
export function buildGeoLocationQuery(
  field: string,
  lat: number,
  lng: number,
  radius?: number
): string[] {
  const queries: string[] = [];

  if (!field) {
    throw new Error('Field is required for geolocation query');
  }

  // For simple point queries, you might use exact lat/lng match
  // For radius searches, you might need to calculate bounds or use Appwrite's geo features
  // This is a basic implementation - enhance based on specific needs

  if (radius) {
    // Calculate approximate bounds for radius search
    const latDelta = (radius / 111.32); // Approximate degrees per km
    const lngDelta = (radius / (111.32 * Math.cos(lat * Math.PI / 180)));

    const minLat = lat - latDelta;
    const maxLat = lat + latDelta;
    const minLng = lng - lngDelta;
    const maxLng = lng + lngDelta;

    // Assuming field is an object with lat/lng or separate fields
    // This might need adjustment based on your data structure
    queries.push(Query.greaterThanEqual(`${field}.latitude`, minLat));
    queries.push(Query.lessThanEqual(`${field}.latitude`, maxLat));
    queries.push(Query.greaterThanEqual(`${field}.longitude`, minLng));
    queries.push(Query.lessThanEqual(`${field}.longitude`, maxLng));
  } else {
    // Exact point match
    queries.push(Query.equal(`${field}.latitude`, lat));
    queries.push(Query.equal(`${field}.longitude`, lng));
  }

  return queries;
}

// =============================================================================
// QUERY VALIDATION AND OPTIMIZATION
// =============================================================================

/**
 * Validate query array
 */
export function validateQueries(queries: string[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(queries)) {
    errors.push('Queries must be an array');
    return { isValid: false, errors };
  }

  // Check for conflicting operations
  const hasLimit = queries.some(q => q.includes('limit('));
  const hasOffset = queries.some(q => q.includes('offset('));

  if (hasOffset && !hasLimit) {
    errors.push('Offset queries should be used with limit for proper pagination');
  }

  // Check for multiple order by (Appwrite allows only one)
  const orderQueries = queries.filter(q => q.includes('orderAsc(') || q.includes('orderDesc('));
  if (orderQueries.length > 1) {
    errors.push('Only one order by query is allowed');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Optimize query array by removing redundant queries and combining where possible
 */
export function optimizeQueries(queries: string[]): string[] {
  let optimized: string[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    // Remove duplicates
    if (seen.has(query)) {
      continue;
    }
    seen.add(query);

    // Check for conflicting operations
    if (query.includes('orderAsc(') || query.includes('orderDesc(')) {
      // Remove any previous order queries
      optimized = optimized.filter(q => !q.includes('orderAsc(') && !q.includes('orderDesc('));
    }

    optimized.push(query);
  }

  return optimized;
}

/**
 * Combine multiple query builders into a single optimized query array
 */
export function combineQueries(...queryArrays: string[][]): string[] {
  const combined = queryArrays.flat();
  return optimizeQueries(combined);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Convert page number to offset
 */
export function pageToOffset(page: number, limit: number): number {
  if (page < 1) return 0;
  return (page - 1) * limit;
}

/**
 * Convert offset to page number
 */
export function offsetToPage(offset: number, limit: number): number {
  return Math.floor(offset / limit) + 1;
}

/**
 * Build cursor-based pagination queries (if supported by Appwrite)
 */
export function buildCursorQueries(cursor?: string, limit?: number): string[] {
  const queries: string[] = [];

  if (cursor) {
    // Appwrite supports cursor pagination with Query.cursorAfter or similar
    queries.push(Query.cursorAfter(cursor));
  }

  if (limit) {
    queries.push(Query.limit(limit));
  }

  return queries;
}