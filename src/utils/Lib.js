// @flow
import {
  NextFunction,
  Response,
  Request,
} from 'express';
import passport from 'passport';
import AppDevResponse from './AppDevResponse';
import UserSessionsRepo from '../repos/UserSessionsRepo';

/**
 * Removes element from array on predicate
 * @function
 * @param {Array<T>} arr - Array to remove elements
 * @param {(param: T, num: number) => boolean} pred - Predicate to determine which elements
 * to remove
 */
function remove<T>(arr: Array<T>, pred: (param: T, num: number) => boolean) {
  for (let i = arr.length - 1; i > -1; i -= 1) {
    if (pred(arr[i], i)) {
      arr.splice(i, 1);
    }
  }
}

/**
 * Makes sure all requests are authenticated
 * @function
 * @param {Request} req - Request object to check
 * @param {Response} res - Response object
 * @param {NextFunction} next - Next function
 */
async function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return passport.authenticate('bearer', { session: false })(req, res, next);
  }
  return next();
}

/**
 * Updates session
 * @function
 * @param {Request} req - Request object
 * @param {Response} res - Response object
 * @param {NextFunction} next - Next function
 */
async function updateSession(req: Request, res: Response, next: NextFunction) {
  const header = req.get('Authorization');
  if (!header) {
    res.send(
      new AppDevResponse(
        false,
        { errors: ['Authorization header missing'] },
      ),
    );
    return next(true);
  }
  const bearerToken = header.replace('Bearer ', '').trim();
  if (!bearerToken) {
    res.send(
      new AppDevResponse(
        false,
        { errors: ['Invalid authorization header'] },
      ),
    );
    return next(true);
  }
  const session = await UserSessionsRepo.updateSession(bearerToken);
  if (!session) {
    res.send(
      new AppDevResponse(
        false,
        { errors: ['Invalid refresh token'] },
      ),
    );
    return next(true);
  }
  req.userSession = session;
  return next();
}

export default {
  remove,
  ensureAuthenticated,
  updateSession,
};
