export type UseCaseResult<T, E extends Error | null> = Ok<T> | Err<E>;

type Ok<T> = {
  readonly ok: true;
  readonly val: T;
  readonly err: null;
};

type Err<E extends Error | null> = {
  readonly ok: false;
  readonly val: null;
  readonly err: E;
};

export const useCaseResultOk = <T>(val: T): Ok<T> => ({
  ok: true,
  val,
  err: null,
});

export const useCaseResultError = <E extends Error | null>(err: E): Err<E> => ({
  ok: false,
  val: null,
  err,
});

type UseCaseMethod = (
  ...args: any[]
) =>
  | UseCaseResult<unknown, Error | null>
  | Promise<UseCaseResult<unknown, Error | null>>;

export type UseCase = Record<string, UseCaseMethod>;
