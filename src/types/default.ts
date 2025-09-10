export interface StatusBody {
  Code: number,
  Message: string
}

export interface DefaultResponseBody<T> {
  data: T | null | undefined,
  Status: StatusBody
}