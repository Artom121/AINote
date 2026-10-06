/** Объект не найден или принадлежит другому пользователю — снаружи это неразличимо. */
export class NotFoundError extends Error {
  constructor(what = "Объект") {
    super(`${what} не найден`);
    this.name = "NotFoundError";
  }
}
