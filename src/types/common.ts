/** Shapes shared by every service: pagination, problems, statistics buckets. */

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** A blocking problem returned by the API as a translatable code. */
export interface Problem {
  code: string;
  params?: Record<string, string | number>;
}

export interface Bucket {
  key: string;
  count: number;
  share: number;
}
