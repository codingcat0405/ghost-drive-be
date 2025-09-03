export type Page<T> = {
  contents: T[];
  currentPage: number;
  perPage: number;
  totalElements: number;
  totalPage: number;
}

export function toPageDTO<T>(findAndCount: [T[], number], page: number, limit: number): Page<T> {
  return {
    contents: findAndCount[0],
    currentPage: page,
    perPage: limit,
    totalElements: findAndCount[1],
    totalPage: Math.ceil(findAndCount[1] / limit),
  }
}
